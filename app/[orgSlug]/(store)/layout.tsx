import Image from 'next/image';
import Link from 'next/link';
import { requireOrg } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logoutAction } from '@/lib/auth/actions';
import { CartLink } from './cart-link';

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug);
  const currency = await getOrgCurrency(ctx.organizationId);

  const supabase = await createSupabaseServerClient();
  const { data: membership } = await supabase
    .from('memberships')
    .select('balance_minor_units')
    .eq('organization_id', ctx.organizationId)
    .eq('user_id', ctx.userId)
    .single();
  const balance = membership?.balance_minor_units ?? 0;

  const showAdminLink = ctx.role !== 'member';

  return (
    <div className="relative min-h-svh">
      <header className="relative z-10 border-b-2 border-foreground bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              href={`/${orgSlug}`}
              className="font-heading text-base font-bold uppercase tracking-tight"
            >
              {ctx.organization.name}
            </Link>
            <nav className="flex items-center gap-1 label-mono">
              <NavLink href={`/${orgSlug}`}>Store</NavLink>
              <CartLink slug={orgSlug} orgId={ctx.organizationId} />
              <NavLink href={`/${orgSlug}/orders`}>Orders</NavLink>
              <NavLink href={`/${orgSlug}/account`}>Account</NavLink>
              {ctx.organization.leaderboard_enabled ? (
                <NavLink href={`/${orgSlug}/leaderboard`}>Leaderboard</NavLink>
              ) : null}
              {showAdminLink ? (
                <Link
                  href={`/${orgSlug}/admin`}
                  className="ml-2 inline-flex border-2 border-foreground bg-secondary px-2 py-1 text-secondary-foreground hover:bg-secondary/90"
                  prefetch={false}
                >
                  Admin ↗
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 border-2 px-3 py-1.5"
              style={{ borderColor: currency.color_hex }}
            >
              {currency.icon_url ? (
                <Image
                  src={currency.icon_url}
                  alt=""
                  width={16}
                  height={16}
                  className="rounded-none"
                />
              ) : (
                <div
                  className="grid size-5 place-items-center text-[10px] font-bold text-black"
                  style={{ backgroundColor: currency.color_hex }}
                >
                  {currency.symbol.slice(0, 1)}
                </div>
              )}
              <span className="font-heading text-base font-bold tabular-nums">
                <Money amount={balance} currency={currency} />
              </span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="label-mono text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-2 py-1 text-muted-foreground hover:text-foreground"
    >
      {children}
    </Link>
  );
}
