// Shape of a variant row passed from the admin form to the server action.
// The server action validates and writes; the client just shapes it.
export type VariantInput = {
  id?: string; // present for existing variants on edit
  name: string;
  options: Record<string, string>; // e.g. { size: 'S', color: 'Red' }
  price_minor_units: number;
  inventory_count: number;
  position: number;
  active: boolean;
};

// Display name from name + options. If options are populated, prefer their
// values joined ("Small / Red"); otherwise fall back to the variant's name.
// Accepts the loosely-typed `options` (Json) from supabase rows.
export function variantDisplayName(v: {
  name: string;
  options?: unknown;
}): string {
  const opts =
    v.options && typeof v.options === 'object' && !Array.isArray(v.options)
      ? (v.options as Record<string, unknown>)
      : null;
  const vals = opts
    ? Object.values(opts).filter(
        (x): x is string => typeof x === 'string' && x.length > 0,
      )
    : [];
  if (vals.length > 0) return vals.join(' / ');
  return v.name;
}
