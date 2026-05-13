import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { safeNextPath } from '@/lib/auth/redirects';
import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in · SwagVault' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safe = safeNextPath(next);
  return (
    <Card accent="primary">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <LoginForm next={safe} />
        <p className="border-t-2 border-foreground/10 pt-4 text-sm text-muted-foreground">
          New to SwagVault?{' '}
          <Link
            href={safe ? `/signup?next=${encodeURIComponent(safe)}` : '/signup'}
            className="font-bold text-foreground underline decoration-secondary decoration-2 underline-offset-4 hover:text-secondary"
          >
            Create an organization →
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
