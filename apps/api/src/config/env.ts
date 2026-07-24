import 'dotenv/config';
import { z } from 'zod';

/**
 * Coerces the loose "truthy string" env convention (`"true"`/`"false"`) into
 * a real boolean. `z.coerce.boolean()` would treat the string `"false"` as
 * truthy (any non-empty string coerces to `true`), which is wrong here.
 */
const booleanFromString = (defaultValue: boolean) =>
  z.preprocess((val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.trim().toLowerCase() === 'true';
    return defaultValue;
  }, z.boolean().default(defaultValue));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),

  // Database / cache
  DATABASE_URL: z
    .string()
    .default('postgresql://declawd:declawd@localhost:5432/declawd?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // API server
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  API_BASE_URL: z.string().default('http://localhost:4000'),
  WEB_BASE_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // JWT / cookies
  JWT_ACCESS_SECRET: z.string().min(1).default('dev-insecure-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(1).default('dev-insecure-refresh-secret-change-me'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  COOKIE_SECRET: z.string().min(1).default('dev-insecure-cookie-secret-change-me'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().default('http://localhost:4000/api/v1/auth/google/callback'),

  // Blockchain / wallet
  POLYGON_RPC_URL: z.string().default('https://polygon-rpc.com'),
  POLYGON_CHAIN_ID: z.coerce.number().int().positive().default(137),
  USDC_CONTRACT_ADDRESS: z.string().default('0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'),

  // Polymarket
  POLYMARKET_CLOB_API_URL: z.string().default('https://clob.polymarket.com'),
  POLYMARKET_GAMMA_API_URL: z.string().default('https://gamma-api.polymarket.com'),
  POLYMARKET_API_KEY: z.string().optional(),
  POLYMARKET_API_SECRET: z.string().optional(),
  POLYMARKET_API_PASSPHRASE: z.string().optional(),

  // Market data / news
  BTC_PRICE_FEED_URL: z.string().default('https://api.coingecko.com/api/v3'),
  NEWS_SENTIMENT_API_KEY: z.string().optional(),

  // Notifications
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('DeClawd <no-reply@declawd.app>'),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),

  // Trading engine
  TRADING_CYCLE_CRON: z.string().default('*/15 * * * *'),
  TRADING_ENGINE_ENABLED: booleanFromString(false),
  PROFIT_VAULT_ALLOCATION_PCT: z.coerce.number().default(70),
  PROFIT_TRADING_POOL_ALLOCATION_PCT: z.coerce.number().default(30),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration - see errors above');
  }

  const env = parsed.data;

  if (env.NODE_ENV === 'production') {
    const problems: string[] = [];
    const insecureDefaults: Array<[string, string]> = [
      ['JWT_ACCESS_SECRET', 'dev-insecure-access-secret-change-me'],
      ['JWT_REFRESH_SECRET', 'dev-insecure-refresh-secret-change-me'],
      ['COOKIE_SECRET', 'dev-insecure-cookie-secret-change-me'],
    ];
    for (const [key, insecureValue] of insecureDefaults) {
      if ((env as unknown as Record<string, string>)[key] === insecureValue) {
        problems.push(`${key} is still set to its insecure development default`);
      }
    }
    if (!env.DATABASE_URL) problems.push('DATABASE_URL is required');
    if (env.TRADING_ENGINE_ENABLED && (!env.POLYMARKET_API_KEY || !env.POLYMARKET_API_SECRET)) {
      // Non-fatal: order relay will simply be unavailable, but scanning/AI still works.
      // eslint-disable-next-line no-console
      console.warn(
        'TRADING_ENGINE_ENABLED=true but POLYMARKET_API_KEY/SECRET are not set - order relay will fail.',
      );
    }
    if (problems.length > 0) {
      throw new Error(`Refusing to start in production with unsafe configuration:\n - ${problems.join('\n - ')}`);
    }
  }

  return env;
}

export const env = loadEnv();

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
