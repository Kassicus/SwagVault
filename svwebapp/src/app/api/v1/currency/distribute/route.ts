import { requirePermission } from "@/lib/api/auth";
import { withApiHandler, apiSuccess, apiError } from "@/lib/api/response";
import { bulkDistribute } from "@/lib/currency/engine";
import { bulkDistributeSchema } from "@/lib/validators/currency";

export const POST = withApiHandler(async (req, ctx) => {
  requirePermission(ctx.permissions, "currency:write");

  const body = await req.json();
  const parsed = bulkDistributeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR", 400);
  }

  const { userIds, amount, reason } = parsed.data;

  const result = await bulkDistribute(
    ctx.tenantId,
    userIds,
    amount,
    reason,
    "api" // performedBy
  );

  return apiSuccess(result);
});
