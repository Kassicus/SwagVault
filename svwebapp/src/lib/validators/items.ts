import { z } from "zod/v4";

export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  price: z.number().int().min(0, "Price must be non-negative"),
  categoryId: z.string().uuid().optional().nullable(),
  stockQuantity: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const optionGroupInputSchema = z.object({
  name: z.string().min(1).max(100),
  values: z.array(z.string().min(1).max(100)).min(1),
});

export const variantInputSchema = z.object({
  options: z.record(z.string(), z.string()),
  stockQuantity: z.number().int().min(0).optional().nullable(),
  priceOverride: z.number().int().min(0).optional().nullable(),
});

export const itemOptionsSchema = z.object({
  optionGroups: z.array(optionGroupInputSchema),
  variants: z.array(variantInputSchema),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type OptionGroupInput = z.infer<typeof optionGroupInputSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
