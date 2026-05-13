import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
    <div className="relative min-h-svh">
      <header className="relative z-10 border-b-2 border-foreground bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/${orgSlug}/admin`}
              className="font-heading text-base font-bold uppercase tracking-tight"
            >
              {ctx.organization.name}
            </Link>
            <Badge variant="primary">Admin</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${orgSlug}`}
              className="border-2 border-foreground bg-card px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-muted"
              prefetch={false}
            >
              Storefront ↗
            </Link>
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
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-1 border-t-2 border-foreground/10 px-6 py-2 label-mono">
          <NavLink href={`/${orgSlug}/admin`}>Dashboard</NavLink>
          <NavLink href={`/${orgSlug}/admin/products`}>Products</NavLink>
          <NavLink href={`/${orgSlug}/admin/orders`}>Orders</NavLink>
          <NavLink href={`/${orgSlug}/admin/members`}>Members</NavLink>
          <NavLink href={`/${orgSlug}/admin/currency`}>Currency</NavLink>
          <NavLink href={`/${orgSlug}/admin/audit-log`}>Audit log</NavLink>
          <NavLink href={`/${orgSlug}/admin/settings`}>Settings</NavLink>
          <NavLink href={`/${orgSlug}/admin/billing`}>Billing</NavLink>
        </nav>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        {children}
      </main>
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
      className="px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  );
}
