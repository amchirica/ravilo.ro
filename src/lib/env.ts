import "server-only";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === undefined ? undefined : value;

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url(),
  CRON_SECRET: optionalString,
  AUTH_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(32).default("dev-only-ravilo-auth-secret-change-me-32+"),
  ),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  PAYMENT_PROVIDER: z.enum(["stripe", "mock", "netopia", "euplatesc", "payu"]).default("mock"),
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalString,
  EMAIL_PROVIDER: z.enum(["console", "resend", "smtp"]).default("console"),
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: z.string().min(1).default("RAVILO <noreply@ravilo.ro>"),
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  SENTRY_DSN: optionalUrl,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: optionalString,
  NEXT_PUBLIC_META_PIXEL_ID: optionalString,
  ALLOW_DEV_SEED: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production") {
    if (env.APP_URL.startsWith("http://")) throw new Error("APP_URL must use HTTPS in production");
    if (env.AUTH_SECRET === "dev-only-ravilo-auth-secret-change-me-32+") {
      throw new Error("AUTH_SECRET must be changed from the development default in production");
    }
    if (env.PAYMENT_PROVIDER === "mock") {
      throw new Error("PAYMENT_PROVIDER=mock is not allowed in production");
    }
    if (env.PAYMENT_PROVIDER === "stripe") {
      if (!env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe");
      }
      if (!env.STRIPE_WEBHOOK_SECRET) {
        throw new Error("STRIPE_WEBHOOK_SECRET is required when PAYMENT_PROVIDER=stripe in production");
      }
      if (env.STRIPE_SECRET_KEY.startsWith("sk_live_") && !env.APP_URL.startsWith("https://")) {
        throw new Error("Live Stripe keys require APP_URL to use HTTPS");
      }
    }
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase URL and SUPABASE_SERVICE_ROLE_KEY are required in production");
    }
  }
  if (env.NODE_ENV !== "production" && env.STRIPE_SECRET_KEY?.startsWith("sk_live_")) {
    throw new Error("Live Stripe key detected outside production");
  }
  cached = env;
  return env;
}

export function resetEnvCacheForTests() {
  cached = undefined;
}
