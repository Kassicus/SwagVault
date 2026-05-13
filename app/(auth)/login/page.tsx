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
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm next={safe} />
        <p className="text-sm text-muted-foreground">
          New to SwagVault?{' '}
          <Link
            href={safe ? `/signup?next=${encodeURIComponent(safe)}` : '/signup'}
            className="font-medium text-foreground underline"
          >
            Create an organization
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
