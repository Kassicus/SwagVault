import { requireAdmin } from '@/lib/auth/session';
import { SettingsForm } from './settings-form';

export const metadata = { title: 'Settings · SwagVault' };

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireAdmin(orgSlug);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organization-level configuration for {ctx.organization.name}.
        </p>
      </div>
      <SettingsForm
        slug={orgSlug}
        initial={{
          name: ctx.organization.name,
          fulfillment_mode: ctx.organization.fulfillment_mode,
          pickup_location: ctx.organization.pickup_location,
          leaderboard_enabled: ctx.organization.leaderboard_enabled,
        }}
      />
    </div>
  );
}
