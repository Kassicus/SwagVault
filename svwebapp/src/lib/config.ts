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
  app: {
    domain: () => process.env.NEXT_PUBLIC_APP_DOMAIN ?? "getswagvault.com",
  },
} as const;
