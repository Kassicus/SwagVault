import { getOrgSlug } from "@/lib/tenant/context";
import { MarketingHome } from "@/components/marketing/home";
import { StoreCatalog } from "@/components/store/catalog";

export default async function RootPage() {
  const slug = await getOrgSlug();

  if (!slug) {
    return <MarketingHome />;
  }

  return <StoreCatalog />;
}
