import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/utils";
import { getOrgSlug } from "@/lib/tenant/context";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { withTenant } from "@/lib/db/tenant";
import { balances, organizationMembers } from "@/lib/db/schema";
import { CartProviderWrapper } from "@/components/store/cart-provider-wrapper";
import { StoreHeader } from "@/components/store/store-header";

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
  const slug = org.slug;
  const qs = slug ? `?tenant=${slug}` : "";
  const currencySymbol = org.currencySymbol ?? "C";

  return (
    <CartProviderWrapper tenantSlug={slug} currencySymbol={currencySymbol}>
      <div className="min-h-screen bg-background">
        <StoreHeader
          orgName={org.name}
          orgLogoUrl={org.logoUrl}
          qs={qs}
          balance={balance}
          currencySymbol={currencySymbol}
          isAdmin={isAdmin}
          displayName={user.displayName}
        />
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </div>
    </CartProviderWrapper>
  );
}
