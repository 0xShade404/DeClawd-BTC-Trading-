import { randomBytes } from 'node:crypto';

/**
 * Minimal SIWE-style ("Sign-In With Ethereum" inspired) message builder used
 * to bind a wallet-link or withdrawal authorization to a specific domain,
 * address, nonce, and timestamp. Not a full EIP-4361 implementation, but
 * follows the same anti-replay shape: the server generates and caches the
 * nonce, the client signs the exact returned message, and the server
 * verifies both the signature and that the message matches what it issued.
 */
export function generateNonce(): string {
  return randomBytes(16).toString('hex');
}

export function buildWalletLinkMessage(params: {
  domain: string;
  address: string;
  nonce: string;
  issuedAt: string;
}): string {
  return [
    `${params.domain} wants you to link this wallet to your DeClawd account.`,
    '',
    `Address: ${params.address}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${params.issuedAt}`,
  ].join('\n');
}

export function buildWithdrawalMessage(params: {
  domain: string;
  address: string;
  amountUsd: number;
  destinationAddress: string;
  nonce: string;
  issuedAt: string;
}): string {
  return [
    `${params.domain} withdrawal authorization.`,
    '',
    `From wallet: ${params.address}`,
    `Amount: ${params.amountUsd.toFixed(2)} USD`,
    `Destination: ${params.destinationAddress}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${params.issuedAt}`,
  ].join('\n');
}
