'use server';

import { redirect } from 'next/navigation';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import { validateSlugFormat } from '@/lib/slug';
import { isBillingEnabled } from '@/lib/billing/flag';

export type OrgSetupState = { error: string | null };

export type SlugAvailability =
  | { available: true }
  | { available: false; reason: 'too-short' | 'invalid' | 'reserved' | 'taken' };

// Called from the client form on debounce.
export async function checkSlugAvailability(slug: string): Promise<SlugAvailability> {
  const normalized = slug.trim().toLowerCase();
  const fmt = validateSlugFormat(normalized);
  if (!fmt.ok) return { available: false, reason: fmt.reason };

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', normalized)
    .maybeSingle();
  if (data) return { available: false, reason: 'taken' };
  return { available: true };
}

export async function createOrgAction(
  _prev: OrgSetupState,
  formData: FormData,
): Promise<OrgSetupState> {
  const name = String(formData.get('name') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();

  if (!name) return { error: 'Organization name is required.' };
  const fmt = validateSlugFormat(slug);
  if (!fmt.ok) {
    return { error: `Slug is ${fmt.reason.replace('-', ' ')}.` };
  }

  // Re-check availability server-side (the live check is just a UX nicety).
  const availability = await checkSlugAvailability(slug);
  if (!availability.available) {
    return { error: `Slug is ${availability.reason}.` };
  }

  // Need the user id from the session.
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect('/login');

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc('setup_organization', {
    p_user_id: u.user.id,
    p_slug: slug,
    p_name: name,
  });
  if (error || !data) {
    return { error: error?.message ?? 'Failed to create organization.' };
  }

  if (!isBillingEnabled()) {
    // Billing is off in this environment; mark the org active so the proxy
    // doesn't park it at /subscription-required.
    await service
      .from('organizations')
      .update({ subscription_status: 'active' })
      .eq('id', data);
    redirect(`/${slug}/admin`);
  }

  redirect(`/signup/plan?slug=${encodeURIComponent(slug)}`);
}
