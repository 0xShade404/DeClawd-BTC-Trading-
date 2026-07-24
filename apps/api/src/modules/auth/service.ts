import { createHash } from 'node:crypto';
import type { PrismaClient, User } from '@declawd/database';
import type { UserDto } from '@declawd/shared';
import { env } from '../../config/env';
import { signAccessToken, signRefreshToken, verifyRefreshToken, ttlToSeconds } from '../../lib/jwt';
import { LedgerService } from '@declawd/trading-engine';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

export interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

export interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  email_verified: string | boolean;
  name?: string;
  picture?: string;
  aud: string;
  exp: string;
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges an OAuth authorization code for tokens via Google's token
 * endpoint - a genuine network call, not a stub. Requires
 * GOOGLE_CLIENT_ID/SECRET to be provisioned for real; without them Google
 * will reject the exchange, which surfaces as a PROVIDER_ERROR to the caller.
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google token exchange failed: ${res.status} ${body}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

/**
 * Verifies the id_token's signature/expiry/audience via Google's tokeninfo
 * endpoint, rather than validating the JWT signature locally against
 * Google's JWKS - fewer moving parts for this scaffold, at the cost of one
 * extra network round trip per login. Swap for local JWKS verification
 * (e.g. `jose`'s `createRemoteJWKSet`) if that round trip becomes a
 * bottleneck.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdTokenPayload> {
  const res = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    throw new Error(`Google id_token verification failed: ${res.status}`);
  }
  const payload = (await res.json()) as GoogleIdTokenPayload;
  if (payload.aud !== env.GOOGLE_CLIENT_ID) {
    throw new Error('Google id_token audience mismatch');
  }
  if (Number(payload.exp) * 1000 < Date.now()) {
    throw new Error('Google id_token expired');
  }
  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    throw new Error('Google account email is not verified');
  }
  return payload;
}

/** Upserts the User row and, for brand-new users, seeds default settings + ledger accounts. */
export async function upsertUserFromGoogle(
  prisma: PrismaClient,
  profile: GoogleIdTokenPayload,
): Promise<{ user: User; isNewUser: boolean }> {
  const existing = await prisma.user.findUnique({ where: { googleSubject: profile.sub } });

  const user = await prisma.user.upsert({
    where: { googleSubject: profile.sub },
    update: {
      email: profile.email,
      displayName: profile.name ?? undefined,
      avatarUrl: profile.picture ?? undefined,
      lastLoginAt: new Date(),
    },
    create: {
      googleSubject: profile.sub,
      email: profile.email,
      displayName: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
      lastLoginAt: new Date(),
    },
  });

  const isNewUser = !existing;
  if (isNewUser) {
    await prisma.userSettings.create({ data: { userId: user.id } });
    await new LedgerService(prisma).getOrCreateAccounts(user.id);
  }

  return { user, isNewUser };
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

/** Issues a fresh access+refresh token pair and persists the refresh token's hash. */
export async function issueTokens(
  prisma: PrismaClient,
  user: User,
  meta: { userAgent?: string; ipAddress?: string },
): Promise<IssuedTokens> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });

  const jti = createHash('sha256').update(`${user.id}:${Date.now()}:${Math.random()}`).digest('hex');
  const refreshToken = signRefreshToken({ sub: user.id, jti });
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: new Date(Date.now() + ttlToSeconds(env.JWT_REFRESH_TTL) * 1000),
    },
  });

  return { accessToken, refreshToken };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Rotates a refresh token: verifies the JWT, confirms the matching DB row
 * is neither revoked nor expired, revokes it, and issues a brand-new pair.
 * Throws on any failure - callers should treat all failures uniformly as
 * "re-authenticate".
 */
export async function rotateRefreshToken(
  prisma: PrismaClient,
  refreshToken: string,
  meta: { userAgent?: string; ipAddress?: string },
): Promise<{ user: User; tokens: IssuedTokens }> {
  const payload = verifyRefreshToken(refreshToken); // throws if invalid/expired signature
  const tokenHash = hashToken(refreshToken);

  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!row || row.userId !== payload.sub) {
    throw new Error('Refresh token not recognized');
  }
  if (row.revokedAt) {
    throw new Error('Refresh token has been revoked');
  }
  if (row.expiresAt.getTime() < Date.now()) {
    throw new Error('Refresh token expired');
  }

  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user) {
    throw new Error('User not found for refresh token');
  }

  await prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
  const tokens = await issueTokens(prisma, user, meta);

  return { user, tokens };
}

export async function revokeRefreshToken(prisma: PrismaClient, refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
