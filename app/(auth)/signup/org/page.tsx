import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OrgSetupForm } from './org-setup-form';

export const metadata = { title: 'Set up your organization · SwagVault' };

export default async function OrgSetupPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up your organization</CardTitle>
      </CardHeader>
      <CardContent>
        <OrgSetupForm />
      </CardContent>
    </Card>
  );
}
