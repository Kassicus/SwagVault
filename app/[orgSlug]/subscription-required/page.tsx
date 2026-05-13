import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <main className="relative mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <Badge variant="warn">Storefront paused</Badge>
      <h1 className="font-heading text-4xl font-black uppercase tracking-tight">
        Subscription required
      </h1>
      <p className="max-w-md text-muted-foreground">
        {ctx.organization.name}&rsquo;s SwagVault subscription is{' '}
        <strong className="text-foreground">
          {ctx.organization.subscription_status}
        </strong>
        . The storefront is paused until billing is restored.
      </p>
      {isAdmin ? (
        <Link
          href={`/${orgSlug}/admin/billing`}
          className={buttonVariants({ size: 'lg' })}
        >
          Manage billing →
        </Link>
      ) : (
        <p className="border-2 border-dashed border-foreground/40 px-4 py-3 text-sm text-muted-foreground">
          Reach out to your organization admin to restore access.
        </p>
      )}
    </main>
  );
}
