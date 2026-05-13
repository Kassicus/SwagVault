'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/session';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { FulfillmentMode } from '@/lib/supabase/types';

export type SettingsState = { error: string | null; success: string | null };

const FULFILLMENT_MODES: FulfillmentMode[] = ['shipping', 'pickup', 'both'];

export async function updateOrgSettingsAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const slug = String(formData.get('slug') ?? '').toLowerCase();
  const name = String(formData.get('name') ?? '').trim();
  const fulfillmentMode = String(formData.get('fulfillment_mode') ?? '') as
    | FulfillmentMode
    | '';
  const pickupLocation =
    String(formData.get('pickup_location') ?? '').trim() || null;
  const leaderboardEnabled = formData.get('leaderboard_enabled') === 'on';

  if (!name) return { error: 'Org name is required.', success: null };
  if (name.length > 100) {
    return { error: 'Org name must be 100 characters or fewer.', success: null };
  }
  if (!FULFILLMENT_MODES.includes(fulfillmentMode as FulfillmentMode)) {
    return { error: 'Invalid fulfillment mode.', success: null };
  }
  // For shipping-or-both modes, a pickup_location isn't required. For pickup-
  // only or both modes, recommend (but don't require) one — admins might want
  // to set "TBD" later. We don't block on it.

  const ctx = await requireAdmin(slug);
  const service = createSupabaseServiceClient();
  const { error } = await service
    .from('organizations')
    .update({
      name,
      fulfillment_mode: fulfillmentMode as FulfillmentMode,
      pickup_location: pickupLocation,
      leaderboard_enabled: leaderboardEnabled,
    })
    .eq('id', ctx.organizationId);
  if (error) return { error: error.message, success: null };

  revalidatePath(`/${slug}/admin/settings`);
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/leaderboard`);
  return { error: null, success: 'Saved.' };
}
