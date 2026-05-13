import { requireAdmin } from '@/lib/auth/session';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { getOrgCurrency } from '@/lib/currency/server';
import { Badge } from '@/components/ui/badge';
import { InviteForm } from './invite-form';
import { MemberManager, type MemberRow } from './member-manager';

export const metadata = { title: 'Members · SwagVault' };

export default async function MembersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireAdmin(orgSlug);

  const service = createSupabaseServiceClient();

  const [{ data: memberships }, { data: invites }, currency] = await Promise.all([
    service
      .from('memberships')
      .select('user_id, role, balance_minor_units, created_at')
      .eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: true }),
    service
      .from('invites')
      .select('id, email, role, expires_at, accepted_at, created_at')
      .eq('organization_id', ctx.organizationId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
    getOrgCurrency(ctx.organizationId),
  ]);

  const members: MemberRow[] = [];
  for (const m of memberships ?? []) {
    const { data } = await service.auth.admin.getUserById(m.user_id);
    members.push({
      userId: m.user_id,
      email: data?.user?.email ?? '(unknown)',
      role: m.role,
      balanceMinorUnits: m.balance_minor_units,
    });
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="label-mono text-muted-foreground">{'// Team'}</p>
        <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
          Members
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Invite teammates to {ctx.organization.name} and grant them{' '}
          {currency.name}.
        </p>
      </div>

      <section className="border-2 border-foreground bg-card p-5 shadow-[5px_5px_0_0_var(--secondary)]">
        <h2 className="font-heading text-lg font-bold uppercase">
          Invite a new member
        </h2>
        <div className="mt-4">
          <InviteForm slug={orgSlug} />
        </div>
      </section>

      <MemberManager
        slug={orgSlug}
        members={members}
        currency={{
          name: currency.name,
          symbol: currency.symbol,
          decimal_places: currency.decimal_places,
        }}
      />

      {(invites ?? []).length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold uppercase">
            Pending invites
          </h2>
          <div className="overflow-hidden border-2 border-foreground bg-card">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-foreground bg-muted text-left label-mono text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-bold">Email</th>
                  <th className="px-4 py-3 font-bold">Role</th>
                  <th className="px-4 py-3 font-bold">Expires</th>
                </tr>
              </thead>
              <tbody>
                {(invites ?? []).map((i, idx) => (
                  <tr
                    key={i.id}
                    className={
                      idx === (invites ?? []).length - 1
                        ? ''
                        : 'border-b-2 border-foreground/10'
                    }
                  >
                    <td className="px-4 py-3">{i.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{i.role}</Badge>
                    </td>
                    <td className="px-4 py-3 label-mono text-muted-foreground">
                      {new Date(i.expires_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
