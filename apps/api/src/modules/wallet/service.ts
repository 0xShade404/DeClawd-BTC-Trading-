import { verifyMessage } from 'viem';
import type { PrismaClient, Wallet } from '@declawd/database';
import type { LinkWalletInput, WalletDto } from '@declawd/shared';
import { env } from '../../config/env';
import { generateNonce, buildWalletLinkMessage } from '../../lib/siwe-message';
import { getNonce, setNonce, deleteNonce } from '../../lib/nonce-store';

const NONCE_NAMESPACE = 'wallet-link:';

function authDomain(): string {
  try {
    return new URL(env.WEB_BASE_URL).host;
  } catch {
    return env.WEB_BASE_URL;
  }
}

/** Generates and caches a wallet-link message the client must sign verbatim. */
export async function requestWalletLinkNonce(address: string): Promise<{ message: string }> {
  const nonce = generateNonce();
  const message = buildWalletLinkMessage({
    domain: authDomain(),
    address,
    nonce,
    issuedAt: new Date().toISOString(),
  });
  await setNonce(`${NONCE_NAMESPACE}${address.toLowerCase()}`, message);
  return { message };
}

export class WalletVerificationError extends Error {}

/**
 * Verifies that `signature` is a valid signature of the EXACT message the
 * server issued for this address (preventing signature replay against a
 * different message) and that recovering the signer from
 * (message, signature) yields `address`.
 */
export async function verifyAndConsumeWalletSignature(input: {
  address: string;
  message: string;
  signature: string;
}): Promise<void> {
  const key = `${NONCE_NAMESPACE}${input.address.toLowerCase()}`;
  const expectedMessage = await getNonce(key);
  if (!expectedMessage || expectedMessage !== input.message) {
    throw new WalletVerificationError('No matching pending nonce for this address - request a new one');
  }

  const isValid = await verifyMessage({
    address: input.address as `0x${string}`,
    message: input.message,
    signature: input.signature as `0x${string}`,
  }).catch(() => false);

  if (!isValid) {
    throw new WalletVerificationError('Signature does not match the address for the given message');
  }

  await deleteNonce(key);
}

export async function linkWallet(prisma: PrismaClient, userId: string, input: LinkWalletInput): Promise<Wallet> {
  await verifyAndConsumeWalletSignature(input);

  const existingForAddress = await prisma.wallet.findUnique({
    where: { address_chainId: { address: input.address, chainId: input.chainId } },
  });
  if (existingForAddress && existingForAddress.userId !== userId) {
    throw new WalletVerificationError('This wallet address is already linked to another account');
  }

  const existingCount = await prisma.wallet.count({ where: { userId } });

  return prisma.wallet.upsert({
    where: { address_chainId: { address: input.address, chainId: input.chainId } },
    update: {
      verificationMessage: input.message,
      verificationSignature: input.signature,
      verifiedAt: new Date(),
    },
    create: {
      userId,
      address: input.address,
      chainId: input.chainId,
      provider: input.provider,
      isPrimary: existingCount === 0,
      verificationMessage: input.message,
      verificationSignature: input.signature,
    },
  });
}

export async function listWallets(prisma: PrismaClient, userId: string): Promise<WalletDto[]> {
  const wallets = await prisma.wallet.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  return wallets.map(toWalletDto);
}

export async function deleteWallet(prisma: PrismaClient, userId: string, walletId: string): Promise<void> {
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet || wallet.userId !== userId) {
    throw new WalletVerificationError('Wallet not found');
  }
  await prisma.wallet.delete({ where: { id: walletId } });

  if (wallet.isPrimary) {
    const next = await prisma.wallet.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
    if (next) {
      await prisma.wallet.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  }
}

export function toWalletDto(wallet: Wallet): WalletDto {
  return {
    id: wallet.id,
    address: wallet.address,
    chainId: wallet.chainId,
    provider: wallet.provider,
    isPrimary: wallet.isPrimary,
    verifiedAt: wallet.verifiedAt.toISOString(),
  };
}
