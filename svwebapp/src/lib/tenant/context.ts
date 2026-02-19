import { headers } from "next/headers";

const ORG_SLUG_HEADER = "x-org-slug";

export async function getOrgSlug(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get(ORG_SLUG_HEADER);
}
