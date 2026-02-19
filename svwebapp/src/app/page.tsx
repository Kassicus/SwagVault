import { getOrgSlug } from "@/lib/tenant/context";
import { MarketingHome } from "@/components/marketing/home";
import { StoreCatalog } from "@/components/store/catalog";

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const slug = await getOrgSlug();

  if (!slug) {
    return <MarketingHome />;
  }

  const params = await searchParams;
  return <StoreCatalog searchParams={params} />;
}
