import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BotIdShield } from '@/components/botid-shield';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { hashInviteToken } from '@/lib/invites';
import { AcceptForm } from './accept-form';

export const metadata = { title: 'Accept invitation · SwagVault' };

type Params = { token: string };

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;

  const service = createSupabaseServiceClient();
  const hash = hashInviteToken(token);
  const { data: invite } = await service
    .from('invites')
    .select(
      'id, email, role, expires_at, accepted_at, organizations!inner(name, slug)',
    )
    .eq('token_hash', hash)
    .maybeSingle();

  const org = invite?.organizations as
    | { name: string; slug: string }
    | undefined;
  const expired = invite ? new Date(invite.expires_at) < new Date() : false;
  const used = !!invite?.accepted_at;
  const invalid = !invite || expired || used;

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center px-6 py-12">
      <BotIdShield />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {invalid
              ? 'Invitation unavailable'
              : `Join ${org?.name ?? 'this team'}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!invite ? (
            <Notice>This invitation link isn&rsquo;t valid.</Notice>
          ) : used ? (
            <Notice>
              This invitation has already been used. Sign in to continue.
            </Notice>
          ) : expired ? (
            <Notice>
              This invitation has expired. Ask your admin to send a new one.
            </Notice>
          ) : (
            <AcceptForm
              token={token}
              email={invite.email}
              role={invite.role}
              orgName={org?.name ?? 'your team'}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
