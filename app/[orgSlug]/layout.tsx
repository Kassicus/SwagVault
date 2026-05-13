import { requireOrg } from '@/lib/auth/session';

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  // Ensures membership; redirects out if not.
  await requireOrg(orgSlug);
  return <>{children}</>;
}
