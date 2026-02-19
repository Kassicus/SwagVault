import { z } from "zod/v4";

export const creditUserSchema = z.object({
  userId: z.uuid(),
  amount: z.number().int().positive("Amount must be positive"),
  reason: z.string().min(1).max(255),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
});

export const debitUserSchema = z.object({
  userId: z.uuid(),
  amount: z.number().int().positive("Amount must be positive"),
  reason: z.string().min(1).max(255),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
});

export const bulkDistributeSchema = z.object({
  userIds: z.array(z.uuid()).min(1, "Select at least one user"),
  amount: z.number().int().positive("Amount must be positive"),
  reason: z.string().min(1).max(255),
});

export type CreditUserInput = z.infer<typeof creditUserSchema>;
export type DebitUserInput = z.infer<typeof debitUserSchema>;
export type BulkDistributeInput = z.infer<typeof bulkDistributeSchema>;
