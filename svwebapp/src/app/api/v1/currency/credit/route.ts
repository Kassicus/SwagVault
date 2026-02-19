import { requirePermission } from "@/lib/api/auth";
import { withApiHandler, apiSuccess, apiError } from "@/lib/api/response";
import { creditUser } from "@/lib/currency/engine";
import { creditUserSchema } from "@/lib/validators/currency";

export const POST = withApiHandler(async (req, ctx) => {
  requirePermission(ctx.permissions, "currency:write");

  const body = await req.json();
  const parsed = creditUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR", 400);
  }

  const { userId, amount, reason } = parsed.data;

  const result = await creditUser(
    ctx.tenantId,
    userId,
    amount,
    reason,
    "api", // performedBy = api
    { type: "api", id: ctx.apiKeyId }
  );

  return apiSuccess(result);
});
