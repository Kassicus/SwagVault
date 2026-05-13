'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/auth/redirects';

export type SignupState = { error: string | null };

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNextPath(String(formData.get('next') ?? ''));

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // If email confirmation is required, session is null. Send the user to a
  // "check your email" path. (Disable email confirmation in Supabase Auth
  // settings for the smoothest onboarding.)
  if (!data.session) {
    redirect('/signup/check-email');
  }

  // Invite recipients land here with ?next=/accept-invite/<token>; skip org setup.
  redirect(next ?? '/signup/org');
}
