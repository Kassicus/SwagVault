'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { findLandingPathForUser } from '@/lib/auth/landing';
import { safeNextPath } from '@/lib/auth/redirects';

export type LoginState = { error: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNextPath(String(formData.get('next') ?? ''));

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    return { error: error?.message ?? 'Unable to sign in.' };
  }

  redirect(next ?? (await findLandingPathForUser(data.user.id)));
}
