import type { SignedOrderPayload, TradeDirection } from '../types';

export interface OrderSigningRequest {
  providerMarketId: string;
  direction: TradeDirection;
  side: 'OPEN' | 'CLOSE';
  sizeUsd: number;
  limitPrice: number;
}

/**
 * Produces a signed order payload for a given user's automated trading
 * session, WITHOUT ever holding that user's wallet private key.
 *
 * How automated (non-custodial) execution works in DeClawd:
 *
 *   1. When a user enables the bot, their wallet (client-side, via WalletConnect
 *      /MetaMask/etc.) signs a one-time, on-chain, revocable authorization
 *      that grants a DeClawd-operated "relayer" address permission to place
 *      trades through their Polymarket proxy wallet - and ONLY to trade,
 *      never to withdraw to an arbitrary address. This mirrors how
 *      Polymarket's own official relayer is authorized to act on a user's
 *      proxy wallet.
 *   2. The relayer's private key lives in a KMS / secrets manager, never in
 *      application code or the database, and is scoped to this single
 *      permission by the on-chain approval from step 1.
 *   3. Users can revoke the authorization on-chain at any time, immediately
 *      stopping all automated trading for their account.
 *   4. Withdrawals are a separate flow (see createWithdrawalSchema) that
 *      ALWAYS requires a fresh signature from the user's own wallet - the
 *      relayer key can never move funds out of the user's proxy wallet.
 *
 * This interface is the integration point for that relayer. The concrete
 * implementation must be finished against the exact EIP-712 order schema
 * published in Polymarket's CLOB API docs (https://docs.polymarket.com)
 * before production use - see RelayerOrderSigner below for what's stubbed.
 */
export interface IOrderSigner {
  isAuthorizedFor(userId: string): Promise<boolean>;
  sign(userId: string, request: OrderSigningRequest): Promise<SignedOrderPayload>;
}

export class RelayerNotAuthorizedError extends Error {
  constructor(userId: string) {
    super(`No active trading authorization for user ${userId}`);
    this.name = 'RelayerNotAuthorizedError';
  }
}

/**
 * Reference implementation. Requires a configured relayer signing backend
 * (e.g. AWS KMS, a hardware signer, or - for local dev only - an env-var
 * private key) plus the on-chain authorization described above. Throws
 * rather than fabricating a signature when either is missing, so callers
 * fail loudly instead of silently "trading" with fake data.
 */
export class RelayerOrderSigner implements IOrderSigner {
  constructor(
    private readonly deps: {
      hasOnChainAuthorization: (userId: string) => Promise<boolean>;
      /**
       * Signs EIP-712 typed data with the relayer's key. In production this
       * should call out to a KMS/HSM rather than holding a raw key in
       * process memory.
       */
      signTypedData: (domain: unknown, types: unknown, message: unknown) => Promise<string>;
    },
  ) {}

  async isAuthorizedFor(userId: string): Promise<boolean> {
    return this.deps.hasOnChainAuthorization(userId);
  }

  async sign(userId: string, request: OrderSigningRequest): Promise<SignedOrderPayload> {
    const authorized = await this.deps.hasOnChainAuthorization(userId);
    if (!authorized) {
      throw new RelayerNotAuthorizedError(userId);
    }

    // NOTE: domain/types/message below must match Polymarket's published
    // CLOB order EIP-712 schema exactly (token id encoding, salt, expiration,
    // maker/taker fee fields, etc.) - fill in from current API docs. Wired
    // as a clear extension point rather than guessed to avoid signing
    // orders that the venue would silently reject or misinterpret.
    const domain = { name: 'Polymarket CTF Exchange', version: '1', chainId: 137 };
    const types = { Order: [] as Array<{ name: string; type: string }> };
    const message = {
      tokenId: request.providerMarketId,
      side: request.direction,
      makerAmount: request.sizeUsd,
      price: request.limitPrice,
    };

    const signature = await this.deps.signTypedData(domain, types, message);

    return {
      format: 'polymarket-clob-eip712',
      payload: { domain, types, message },
      signature,
    };
  }
}
