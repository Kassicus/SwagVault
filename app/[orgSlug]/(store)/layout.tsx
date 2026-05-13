import Image from 'next/image';
import Link from 'next/link';
import { requireOrg } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logoutAction } from '@/lib/auth/actions';

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
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href={`/${orgSlug}`} className="text-sm font-semibold">
              {ctx.organization.name}
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href={`/${orgSlug}`}>Store</Link>
              <Link href={`/${orgSlug}/account`}>My account</Link>
              {showAdminLink ? (
                <Link
                  href={`/${orgSlug}/admin`}
                  className="text-foreground"
                  prefetch={false}
                >
                  Admin ↗
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
              style={{ borderColor: currency.color_hex }}
            >
              {currency.icon_url ? (
                <Image
                  src={currency.icon_url}
                  alt=""
                  width={16}
                  height={16}
                  className="rounded"
                />
              ) : (
                <div
                  className="grid h-4 w-4 place-items-center rounded text-[10px] font-medium text-white"
                  style={{ backgroundColor: currency.color_hex }}
                >
                  {currency.symbol.slice(0, 1)}
                </div>
              )}
              <Money amount={balance} currency={currency} />
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
