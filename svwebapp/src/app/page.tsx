import { eq, and } from "drizzle-orm";
import { getOrgSlug } from "@/lib/tenant/context";
import { getCurrentUser } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { withTenant } from "@/lib/db/tenant";
import { balances, organizationMembers } from "@/lib/db/schema";
import { MarketingHome } from "@/components/marketing/home";
import { StoreCatalog } from "@/components/store/catalog";
import { CartProviderWrapper } from "@/components/store/cart-provider-wrapper";
import { StoreHeader } from "@/components/store/store-header";

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const slug = await getOrgSlug();

  if (!slug) {
    return <MarketingHome />;
  }

  // Store mode: provide the same chrome as the (store) layout
  const user = await getCurrentUser();
  if (!user) {
    // StoreCatalog handles its own redirect to login
    const params = await searchParams;
    return <StoreCatalog searchParams={params} />;
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
  const qs = `?tenant=${slug}`;
  const currencySymbol = org.currencySymbol ?? "C";
  const params = await searchParams;

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
        <main className="mx-auto max-w-7xl px-4 py-8">
          <StoreCatalog searchParams={params} />
        </main>
      </div>
    </CartProviderWrapper>
  );
}
