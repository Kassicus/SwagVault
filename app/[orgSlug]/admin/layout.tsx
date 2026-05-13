import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { logoutAction } from '@/lib/auth/actions';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireAdmin(orgSlug);

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href={`/${orgSlug}/admin`} className="text-sm font-semibold">
              {ctx.organization.name}
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href={`/${orgSlug}/admin`}>Dashboard</Link>
              <Link href={`/${orgSlug}/admin/products`}>Products</Link>
              <Link href={`/${orgSlug}/admin/members`}>Members</Link>
              <Link href={`/${orgSlug}/admin/currency`}>Currency</Link>
              <Link href={`/${orgSlug}/admin/billing`}>Billing</Link>
              <Link
                href={`/${orgSlug}`}
                className="text-foreground"
                prefetch={false}
              >
                Storefront ↗
              </Link>
            </nav>
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
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
