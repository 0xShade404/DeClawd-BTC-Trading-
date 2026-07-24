import { recoverMessageAddress } from 'viem';
import type { PrismaClient, Withdrawal } from '@declawd/database';
import type { CreateWithdrawalInput, PaginatedResult, WithdrawalDto } from '@declawd/shared';
import { ErrorCode } from '@declawd/shared';
import { LedgerService } from '@declawd/trading-engine';
import { env } from '../../config/env';
import { ApiError } from '../../plugins/error-handler';
import { buildWithdrawalMessage, generateNonce } from '../../lib/siwe-message';
import { getNonce, setNonce, deleteNonce } from '../../lib/nonce-store';
import { paginationSkipTake, toPaginatedResult } from '../../lib/pagination';

const NONCE_NAMESPACE = 'withdrawal:';

function authDomain(): string {
  try {
    return new URL(env.WEB_BASE_URL).host;
  } catch {
    return env.WEB_BASE_URL;
  }
}

export class WithdrawalVerificationError extends Error {}

/**
 * Issues a withdrawal-authorization message bound to the caller's primary
 * wallet, the requested amount, and destination address, so the eventual
 * signature can't be replayed against a different amount/destination.
 */
export async function requestWithdrawalNonce(
  prisma: PrismaClient,
  userId: string,
  params: { amountUsd: number; destinationAddress: string },
): Promise<{ message: string }> {
  const wallet = await prisma.wallet.findFirst({ where: { userId, isPrimary: true } });
  if (!wallet) {
    throw new WithdrawalVerificationError('Link a verified wallet before requesting a withdrawal');
  }

  const nonce = generateNonce();
  const message = buildWithdrawalMessage({
    domain: authDomain(),
    address: wallet.address,
    amountUsd: params.amountUsd,
    destinationAddress: params.destinationAddress,
    nonce,
    issuedAt: new Date().toISOString(),
  });

  await setNonce(`${NONCE_NAMESPACE}${userId}`, message);
  return { message };
}

/**
 * Verifies the withdrawal signature, debits the ledger, and records a
 * Withdrawal row.
 *
 * The resulting status is SIGNED, not CONFIRMED: CONFIRMED is reserved for
 * once a background worker has actually submitted and confirmed the
 * on-chain transfer (see the txHash field). Marking it CONFIRMED here,
 * before any on-chain transaction exists, would misrepresent a
 * non-custodial platform's core guarantee - funds are reserved
 * (ledger-debited) but the on-chain leg is a separate, not-yet-implemented
 * integration point.
 */
export async function createWithdrawal(
  prisma: PrismaClient,
  userId: string,
  input: CreateWithdrawalInput,
): Promise<Withdrawal> {
  const cachedMessage = await getNonce(`${NONCE_NAMESPACE}${userId}`);
  if (!cachedMessage || cachedMessage !== input.message) {
    throw new WithdrawalVerificationError('No matching pending withdrawal authorization - request a new one');
  }

  const recoveredAddress = await recoverMessageAddress({
    message: input.message,
    signature: input.signature as `0x${string}`,
  }).catch(() => null);

  if (!recoveredAddress) {
    throw new WithdrawalVerificationError('Could not recover a signer address from the provided signature');
  }

  const wallets = await prisma.wallet.findMany({ where: { userId } });
  const matchingWallet = wallets.find((w) => w.address.toLowerCase() === recoveredAddress.toLowerCase());
  if (!matchingWallet) {
    throw new WithdrawalVerificationError('Signature was not produced by a wallet linked to this account');
  }

  await deleteNonce(`${NONCE_NAMESPACE}${userId}`);

  const account = await prisma.ledgerAccount.findUnique({
    where: { userId_type: { userId, type: input.sourceAccount } },
  });
  if (!account || Number(account.balance) < input.amountUsd) {
    throw new ApiError(ErrorCode.INSUFFICIENT_BALANCE, 'Insufficient balance for this withdrawal');
  }

  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId,
      sourceAccount: input.sourceAccount,
      amountUsd: input.amountUsd,
      destinationAddress: input.destinationAddress,
      status: 'SIGNED',
    },
  });

  await new LedgerService(prisma).recordWithdrawal(userId, withdrawal.id, input.sourceAccount, input.amountUsd);

  return withdrawal;
}

export async function listWithdrawals(
  prisma: PrismaClient,
  userId: string,
  params: { page: number; pageSize: number },
): Promise<PaginatedResult<WithdrawalDto>> {
  const where = { userId };
  const [withdrawals, total] = await Promise.all([
    prisma.withdrawal.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      ...paginationSkipTake(params.page, params.pageSize),
    }),
    prisma.withdrawal.count({ where }),
  ]);
  return toPaginatedResult(withdrawals.map(toWithdrawalDto), params.page, params.pageSize, total);
}

export function toWithdrawalDto(withdrawal: Withdrawal): WithdrawalDto {
  return {
    id: withdrawal.id,
    sourceAccount: withdrawal.sourceAccount,
    amountUsd: Number(withdrawal.amountUsd),
    destinationAddress: withdrawal.destinationAddress,
    status: withdrawal.status,
    txHash: withdrawal.txHash,
    requestedAt: withdrawal.requestedAt.toISOString(),
    confirmedAt: withdrawal.confirmedAt ? withdrawal.confirmedAt.toISOString() : null,
  };
}
