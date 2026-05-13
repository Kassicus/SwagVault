import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CurrencyConfig } from './format';

export type OrgCurrency = CurrencyConfig & {
  organization_id: string;
  color_hex: string;
  icon_url: string | null;
  updated_at: string;
};

// Cached per-request: multiple components in the same render call this once.
export const getOrgCurrency = cache(async (orgId: string): Promise<OrgCurrency> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('organization_currencies')
    .select(
      'organization_id, name, symbol, color_hex, icon_url, decimal_places, updated_at',
    )
    .eq('organization_id', orgId)
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? 'organization_currencies row missing');
  }
  return data;
});
