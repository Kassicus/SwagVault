import { requireAdmin } from '@/lib/auth/session';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { InviteForm } from './invite-form';

export const metadata = { title: 'Members · SwagVault' };

export default async function MembersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireAdmin(orgSlug);

  const service = createSupabaseServiceClient();
  const { data: memberships } = await service
    .from('memberships')
    .select('user_id, role, balance_minor_units, created_at')
    .eq('organization_id', ctx.organizationId)
    .order('created_at', { ascending: true });

  const { data: invites } = await service
    .from('invites')
    .select('id, email, role, expires_at, accepted_at, created_at')
    .eq('organization_id', ctx.organizationId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-muted-foreground">
          Invite teammates to {ctx.organization.name}.
        </p>
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Invite a new member</h2>
        <InviteForm slug={orgSlug} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Current members</h2>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-normal">User ID</th>
                <th className="px-4 py-2 font-normal">Role</th>
                <th className="px-4 py-2 font-normal">Balance</th>
              </tr>
            </thead>
            <tbody>
              {(memberships ?? []).map((m) => (
                <tr key={m.user_id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{m.user_id}</td>
                  <td className="px-4 py-2">{m.role}</td>
                  <td className="px-4 py-2">{m.balance_minor_units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
