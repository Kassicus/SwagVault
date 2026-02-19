function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  database: {
    url: () => requireEnv("DATABASE_URL"),
  },
  supabase: {
    url: () => requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: () => requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  },
  auth: {
    secret: () => requireEnv("NEXTAUTH_SECRET"),
    url: () => requireEnv("NEXTAUTH_URL"),
  },
  email: {
    apiKey: () => requireEnv("RESEND_API_KEY"),
    from: () => process.env.EMAIL_FROM ?? "SwagVault <noreply@getswagvault.com>",
  },
  stripe: {
    secretKey: () => requireEnv("STRIPE_SECRET_KEY"),
    publishableKey: () => requireEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    webhookSecret: () => requireEnv("STRIPE_WEBHOOK_SECRET"),
    proPriceId: () => requireEnv("STRIPE_PRO_PRICE_ID"),
    enterprisePriceId: () => requireEnv("STRIPE_ENTERPRISE_PRICE_ID"),
  },
  microsoft: {
    clientId: () => requireEnv("MICROSOFT_CLIENT_ID"),
    clientSecret: () => requireEnv("MICROSOFT_CLIENT_SECRET"),
  },
  app: {
    domain: () => process.env.NEXT_PUBLIC_APP_DOMAIN ?? "getswagvault.com",
  },
} as const;
