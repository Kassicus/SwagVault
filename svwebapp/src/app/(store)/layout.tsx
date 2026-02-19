import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/utils";
import { getOrgSlug } from "@/lib/tenant/context";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { withTenant } from "@/lib/db/tenant";
import { balances, organizationMembers } from "@/lib/db/schema";
import { BalancePill } from "@/components/store/balance-pill";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    const slug = await getOrgSlug();
    redirect(slug ? `/login?tenant=${slug}` : "/login");
  }

  const org = await getResolvedTenant();

  const { balance, role } = await withTenant(org.id, async (tx) => {
    const [bal] = await tx
      .select({ balance: balances.balance })
      .from(balances)
      .where(and(eq(balances.tenantId, org.id), eq(balances.userId, user.id)));

    const [member] = await tx
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.tenantId, org.id),
          eq(organizationMembers.userId, user.id)
        )
      );

    return { balance: bal?.balance ?? 0, role: member?.role ?? "member" };
  });

  const isAdmin = ["owner", "admin", "manager"].includes(role);

  // Preserve ?tenant= param for dev mode links
  const slug = org.slug;
  const qs = slug ? `?tenant=${slug}` : "";

  return (
    <div className="min-h-screen bg-background">
      {/* Store Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href={`/${qs}`}>
              {org.logoUrl ? (
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  className="h-8 w-8 rounded-md object-cover"
                />
              ) : (
                <span className="text-lg font-bold">{org.name}</span>
              )}
            </Link>
            <nav className="hidden items-center gap-4 text-sm md:flex">
              <Link
                href={`/${qs}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Catalog
              </Link>
              <Link
                href={`/orders${qs}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Orders
              </Link>
              <Link
                href={`/cart${qs}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Cart
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <BalancePill
              balance={balance}
              currencySymbol={org.currencySymbol ?? "C"}
            />
            {isAdmin && (
              <Link
                href={`/admin/dashboard${qs}`}
                className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                Admin
              </Link>
            )}
            <ThemeToggle />
            <Link
              href={`/profile${qs}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {user.displayName}
            </Link>
          </div>
        </div>
      </header>

      {/* Store Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
