import { eq, count } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { organizationMembers, users, balances } from "@/lib/db/schema";
import { requirePermission } from "@/lib/api/auth";
import { withApiHandler, apiPaginated } from "@/lib/api/response";
import { paginationOffset } from "@/lib/db/pagination";
import { paginationSchema } from "@/lib/validators/api";

export const GET = withApiHandler(async (req, ctx) => {
  requirePermission(ctx.permissions, "members:read");

  const url = new URL(req.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  const result = await withTenant(ctx.tenantId, async (tx) => {
    const where = eq(organizationMembers.tenantId, ctx.tenantId);

    const [totalRow] = await tx
      .select({ count: count() })
      .from(organizationMembers)
      .where(where);

    const rows = await tx
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
      .where(where)
      .limit(pageSize)
      .offset(paginationOffset(page, pageSize));

    return { rows, total: totalRow?.count ?? 0 };
  });

  return apiPaginated(result.rows, page, pageSize, result.total);
});
