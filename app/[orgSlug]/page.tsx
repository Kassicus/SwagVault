import { requireOrg } from '@/lib/auth/session';

export default async function StorefrontHome({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug);
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {ctx.organization.name}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Storefront placeholder — products land in Phase 3.
      </p>
    </main>
  );
}
