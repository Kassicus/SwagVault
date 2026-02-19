import { eq, and } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { organizationMembers, users, balances } from "@/lib/db/schema";
import { requirePermission } from "@/lib/api/auth";
import { withApiHandler, apiSuccess, apiError } from "@/lib/api/response";

export const GET = withApiHandler(async (_req, ctx, params) => {
  requirePermission(ctx.permissions, "members:read");

  const id = params?.id;
  if (!id) return apiError("Member ID required", "BAD_REQUEST", 400);

  const result = await withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: organizationMembers.role,
        isActive: organizationMembers.isActive,
        balance: balances.balance,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .leftJoin(
        balances,
        eq(organizationMembers.userId, balances.userId)
      )
      .where(
        and(
          eq(organizationMembers.id, id),
          eq(organizationMembers.tenantId, ctx.tenantId)
        )
      );
    return row;
  });

  if (!result) return apiError("Member not found", "NOT_FOUND", 404);

  return apiSuccess(result);
});
