'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { VariantInput } from '@/lib/products/types';

export type SaveState = { error: string | null; redirectTo?: string };

type ParsedInput = {
  name: string;
  description: string | null;
  tags: string[];
  active: boolean;
  image_paths: string[];
  variants: VariantInput[];
};

function parseFormData(formData: FormData): ParsedInput {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');
  if (name.length > 200) throw new Error('Name must be 200 characters or fewer.');

  const description =
    String(formData.get('description') ?? '').trim() || null;

  const tagsRaw = String(formData.get('tags') ?? '').trim();
  const tags = tagsRaw
    ? tagsRaw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 16)
    : [];

  const active = formData.get('active') === 'on';

  let image_paths: string[];
  try {
    const parsed = JSON.parse(String(formData.get('image_paths_json') ?? '[]'));
    if (!Array.isArray(parsed)) throw new Error('bad image_paths');
    image_paths = parsed.filter((s): s is string => typeof s === 'string');
  } catch {
    image_paths = [];
  }
  if (image_paths.length > 8) {
    throw new Error('Maximum 8 images per product.');
  }

  let variants: VariantInput[];
  try {
    const parsed = JSON.parse(String(formData.get('variants_json') ?? '[]'));
    if (!Array.isArray(parsed)) throw new Error('bad variants');
    variants = parsed as VariantInput[];
  } catch {
    throw new Error('Invalid variants payload.');
  }

  if (variants.length === 0) {
    throw new Error('At least one variant is required.');
  }
  const seenNames = new Set<string>();
  variants.forEach((v, i) => {
    if (!v.name || !String(v.name).trim()) {
      throw new Error(`Variant ${i + 1} needs a name.`);
    }
    const key = String(v.name).trim().toLowerCase();
    if (seenNames.has(key)) {
      throw new Error(`Duplicate variant name: ${v.name}.`);
    }
    seenNames.add(key);
    if (!Number.isInteger(v.price_minor_units) || v.price_minor_units < 0) {
      throw new Error(`Variant ${v.name}: price must be a non-negative integer.`);
    }
    if (!Number.isInteger(v.inventory_count) || v.inventory_count < 0) {
      throw new Error(
        `Variant ${v.name}: inventory must be a non-negative integer.`,
      );
    }
  });

  return { name, description, tags, active, image_paths, variants };
}

export async function createProductAction(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const slug = String(formData.get('slug') ?? '').toLowerCase();
  const ctx = await requireAdmin(slug);

  let parsed: ParsedInput;
  try {
    parsed = parseFormData(formData);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Validation failed.' };
  }

  const service = createSupabaseServiceClient();
  const { data: product, error } = await service
    .from('products')
    .insert({
      organization_id: ctx.organizationId,
      name: parsed.name,
      description: parsed.description,
      tags: parsed.tags,
      active: parsed.active,
      image_paths: parsed.image_paths,
    })
    .select('id')
    .single();
  if (error || !product) {
    return { error: error?.message ?? 'Failed to create product.' };
  }

  const variantRows = parsed.variants.map((v, i) => ({
    product_id: product.id,
    organization_id: ctx.organizationId,
    name: v.name.trim(),
    options: v.options ?? {},
    price_minor_units: v.price_minor_units,
    inventory_count: v.inventory_count,
    position: i,
    active: v.active,
  }));
  const { error: vErr } = await service
    .from('product_variants')
    .insert(variantRows);
  if (vErr) return { error: vErr.message };

  revalidatePath(`/${slug}/admin/products`);
  revalidatePath(`/${slug}`);
  return { error: null, redirectTo: `/${slug}/admin/products` };
}

export async function updateProductAction(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const slug = String(formData.get('slug') ?? '').toLowerCase();
  const productId = String(formData.get('product_id') ?? '');
  if (!productId) return { error: 'Missing product id.' };
  const ctx = await requireAdmin(slug);

  let parsed: ParsedInput;
  try {
    parsed = parseFormData(formData);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Validation failed.' };
  }

  const service = createSupabaseServiceClient();

  const { error: pErr } = await service
    .from('products')
    .update({
      name: parsed.name,
      description: parsed.description,
      tags: parsed.tags,
      active: parsed.active,
      image_paths: parsed.image_paths,
    })
    .eq('id', productId)
    .eq('organization_id', ctx.organizationId);
  if (pErr) return { error: pErr.message };

  // Sync variants: delete removed, update kept, insert new.
  const { data: existing } = await service
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);
  const incomingIds = new Set(
    parsed.variants.filter((v) => v.id).map((v) => v.id as string),
  );
  const toDelete = (existing ?? [])
    .filter((v) => !incomingIds.has(v.id))
    .map((v) => v.id);
  if (toDelete.length > 0) {
    const { error: dErr } = await service
      .from('product_variants')
      .delete()
      .in('id', toDelete);
    if (dErr) return { error: dErr.message };
  }

  for (let i = 0; i < parsed.variants.length; i++) {
    const v = parsed.variants[i];
    if (v.id) {
      const { error: uErr } = await service
        .from('product_variants')
        .update({
          name: v.name.trim(),
          options: v.options ?? {},
          price_minor_units: v.price_minor_units,
          inventory_count: v.inventory_count,
          position: i,
          active: v.active,
        })
        .eq('id', v.id)
        .eq('product_id', productId);
      if (uErr) return { error: uErr.message };
    } else {
      const { error: iErr } = await service.from('product_variants').insert({
        product_id: productId,
        organization_id: ctx.organizationId,
        name: v.name.trim(),
        options: v.options ?? {},
        price_minor_units: v.price_minor_units,
        inventory_count: v.inventory_count,
        position: i,
        active: v.active,
      });
      if (iErr) return { error: iErr.message };
    }
  }

  revalidatePath(`/${slug}/admin/products`);
  revalidatePath(`/${slug}/admin/products/${productId}`);
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/product/${productId}`);
  return { error: null, redirectTo: `/${slug}/admin/products` };
}

export async function deleteProductAction(formData: FormData) {
  const slug = String(formData.get('slug') ?? '').toLowerCase();
  const productId = String(formData.get('product_id') ?? '');
  if (!productId) throw new Error('Missing product id.');
  const ctx = await requireAdmin(slug);
  const service = createSupabaseServiceClient();
  const { error } = await service
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('organization_id', ctx.organizationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/${slug}/admin/products`);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}/admin/products`);
}
