import { z } from "zod/v4";

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const webhookCreateSchema = z.object({
  url: z.url("Must be a valid URL"),
  events: z.array(z.string()).min(1, "Select at least one event"),
});

export const webhookUpdateSchema = z.object({
  url: z.url("Must be a valid URL").optional(),
  events: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
});

export const API_PERMISSIONS = [
  { value: "items:read", label: "Items: Read", description: "List and view catalog items" },
  { value: "members:read", label: "Members: Read", description: "List and view members" },
  { value: "orders:read", label: "Orders: Read", description: "List and view orders" },
  { value: "currency:write", label: "Currency: Write", description: "Credit, debit, and distribute currency" },
] as const;

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type WebhookCreateInput = z.infer<typeof webhookCreateSchema>;
