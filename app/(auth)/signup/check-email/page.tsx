import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Check your email · SwagVault' };

export default function CheckEmailPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>We sent you a confirmation link.</p>
        <p>
          Once your email is verified you&rsquo;ll be brought back here to
          finish setting up your organization.
        </p>
      </CardContent>
    </Card>
  );
}
