import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { safeNextPath } from '@/lib/auth/redirects';
import { SignupForm } from './signup-form';

export const metadata = { title: 'Create your organization · SwagVault' };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safe = safeNextPath(next);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignupForm next={safe} />
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href={safe ? `/login?next=${encodeURIComponent(safe)}` : '/login'}
            className="font-medium text-foreground underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
