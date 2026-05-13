import { requireAdmin } from '@/lib/auth/session';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { getOrgCurrency } from '@/lib/currency/server';
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

  // Hydrate member emails via the admin API.
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
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-muted-foreground">
          Invite teammates to {ctx.organization.name} and grant them{' '}
          {currency.name}.
        </p>
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Invite a new member</h2>
        <InviteForm slug={orgSlug} />
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
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Pending invites</h2>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-normal">Email</th>
                  <th className="px-4 py-2 font-normal">Role</th>
                  <th className="px-4 py-2 font-normal">Expires</th>
                </tr>
              </thead>
              <tbody>
                {(invites ?? []).map((i) => (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{i.email}</td>
                    <td className="px-4 py-2">{i.role}</td>
                    <td className="px-4 py-2">
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
