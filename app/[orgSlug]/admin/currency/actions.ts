'use server';

import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { requireAdmin } from '@/lib/auth/session';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';
import { logAudit } from '@/lib/audit/log';

export type SaveCurrencyState = {
  error: string | null;
  success: boolean;
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);
const MAX_BYTES = 2 * 1024 * 1024;

export async function saveCurrencyAction(
  _prev: SaveCurrencyState,
  formData: FormData,
): Promise<SaveCurrencyState> {
  const slug = String(formData.get('slug') ?? '').toLowerCase();
  if (!slug) return { error: 'Missing slug.', success: false };
  const ctx = await requireAdmin(slug);

  const name = String(formData.get('name') ?? '').trim();
  const symbol = String(formData.get('symbol') ?? '').trim();
  const colorHex = String(formData.get('color_hex') ?? '').trim();
  const decimalPlaces = Number(formData.get('decimal_places') ?? 0);

  if (!name || name.length > 40) {
    return { error: 'Name must be between 1 and 40 characters.', success: false };
  }
  if (!symbol || symbol.length > 8) {
    return { error: 'Symbol must be between 1 and 8 characters.', success: false };
  }
  if (!HEX_RE.test(colorHex)) {
    return { error: 'Color must be a hex like #6366f1.', success: false };
  }
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 4) {
    return { error: 'Decimal places must be between 0 and 4.', success: false };
  }

  let iconUrl: string | undefined;
  const icon = formData.get('icon');
  if (icon instanceof File && icon.size > 0) {
    if (!ALLOWED_MIME.has(icon.type)) {
      return {
        error: 'Icon must be PNG, JPEG, WebP, or SVG.',
        success: false,
      };
    }
    if (icon.size > MAX_BYTES) {
      return { error: 'Icon must be under 2MB.', success: false };
    }
    const ext = icon.type.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    const pathname = `currency-icons/${ctx.organizationId}/${Date.now()}.${ext}`;
    const blob = await put(pathname, icon, {
      access: 'public',
      addRandomSuffix: false,
    });
    iconUrl = blob.url;
  }

  const update: Database['public']['Tables']['organization_currencies']['Update'] =
    {
      name,
      symbol,
      color_hex: colorHex,
      decimal_places: decimalPlaces,
    };
  if (iconUrl) update.icon_url = iconUrl;

  const service = createSupabaseServiceClient();
  const { error } = await service
    .from('organization_currencies')
    .update(update)
    .eq('organization_id', ctx.organizationId);
  if (error) return { error: error.message, success: false };

  await logAudit({
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    action: 'currency_updated',
    targetType: 'currency',
    targetId: ctx.organizationId,
    metadata: {
      name,
      symbol,
      color_hex: colorHex,
      decimal_places: decimalPlaces,
      icon_changed: !!iconUrl,
    },
  });

  revalidatePath(`/${slug}/admin/currency`);
  revalidatePath(`/${slug}/admin`);
  revalidatePath(`/${slug}`);
  return { error: null, success: true };
}
