import { z } from "zod/v4";

export const createAccountSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2, "Name must be at least 2 characters").max(100),
});

export const createOrgSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters").max(255),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
});

export const configureCurrencySchema = z.object({
  currencyName: z.string().min(1, "Currency name is required").max(50),
  currencySymbol: z.string().min(1, "Symbol is required").max(10),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type ConfigureCurrencyInput = z.infer<typeof configureCurrencySchema>;
