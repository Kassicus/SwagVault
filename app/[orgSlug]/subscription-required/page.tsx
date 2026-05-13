import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { requireOrg } from '@/lib/auth/session';

export const metadata = { title: 'Subscription required · SwagVault' };

export default async function SubscriptionRequiredPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug);
  const isAdmin = ctx.role !== 'member';

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Subscription required
      </h1>
      <p className="text-muted-foreground">
        {ctx.organization.name}&rsquo;s SwagVault subscription is{' '}
        <strong>{ctx.organization.subscription_status}</strong>. The storefront
        is paused until billing is restored.
      </p>
      {isAdmin ? (
        <Link
          href={`/${orgSlug}/admin/billing`}
          className={buttonVariants({ size: 'lg' })}
        >
          Manage billing
        </Link>
      ) : (
        <p className="text-sm text-muted-foreground">
          Reach out to your organization admin to restore access.
        </p>
      )}
    </main>
  );
}
