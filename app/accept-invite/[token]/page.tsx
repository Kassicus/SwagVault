import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { BotIdShield } from '@/components/botid-shield';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
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

  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();

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
            <Notice>This invitation has already been used.</Notice>
          ) : expired ? (
            <Notice>This invitation has expired.</Notice>
          ) : !u.user ? (
            <UnauthCta token={token} email={invite.email} />
          ) : u.user.email?.toLowerCase() !== invite.email.toLowerCase() ? (
            <Notice>
              This invite is for <strong>{invite.email}</strong>. Sign in with
              that email to accept.
            </Notice>
          ) : (
            <AcceptForm token={token} role={invite.role} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function UnauthCta({ token, email }: { token: string; email: string }) {
  const next = `/accept-invite/${token}`;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Sign in or create a SwagVault account for <strong>{email}</strong> to
        accept.
      </p>
      <div className="flex gap-2">
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className={buttonVariants({ size: 'default' })}
        >
          Sign in
        </Link>
        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          className={buttonVariants({ variant: 'outline', size: 'default' })}
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
