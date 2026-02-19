import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { withTenant } from "@/lib/db/tenant";
import { transactions, users, organizationMembers, balances } from "@/lib/db/schema";
import { toCSV } from "@/lib/csv";

export async function GET(request: NextRequest) {
  await requireAuth();
  const org = await getResolvedTenant();

  const type = request.nextUrl.searchParams.get("type");

  if (type === "ledger") {
    const data = await withTenant(org.id, async (tx) => {
      return tx
        .select({
          type: transactions.type,
          amount: transactions.amount,
          balanceAfter: transactions.balanceAfter,
          reason: transactions.reason,
          createdAt: transactions.createdAt,
          userName: users.displayName,
          userEmail: users.email,
        })
        .from(transactions)
        .innerJoin(users, eq(transactions.userId, users.id))
        .where(eq(transactions.tenantId, org.id))
        .orderBy(desc(transactions.createdAt));
    });

    const csv = toCSV(
      ["Date", "User", "Email", "Type", "Amount", "Balance After", "Reason"],
      data.map((tx) => [
        new Date(tx.createdAt).toISOString(),
        tx.userName,
        tx.userEmail,
        tx.type,
        tx.amount,
        tx.balanceAfter,
        tx.reason,
      ])
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ledger-${org.slug}.csv"`,
      },
    });
  }

  if (type === "users") {
    const data = await withTenant(org.id, async (tx) => {
      return tx
        .select({
          displayName: users.displayName,
          email: users.email,
          role: organizationMembers.role,
          isActive: organizationMembers.isActive,
          balance: balances.balance,
          joinedAt: organizationMembers.joinedAt,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .leftJoin(balances, eq(balances.userId, users.id))
        .where(eq(organizationMembers.tenantId, org.id));
    });

    const csv = toCSV(
      ["Name", "Email", "Role", "Active", "Balance", "Joined"],
      data.map((m) => [
        m.displayName,
        m.email,
        m.role,
        m.isActive ? "Yes" : "No",
        m.balance ?? 0,
        new Date(m.joinedAt).toISOString(),
      ])
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="users-${org.slug}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
}
