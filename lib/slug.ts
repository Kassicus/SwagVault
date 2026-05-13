// Keep in sync with the slug_format CHECK constraint and is_reserved_slug()
// function in supabase/migrations/0001_init.sql.

export const RESERVED_SLUGS = new Set<string>([
  'admin','api','app','auth','billing','blog','contact','dashboard','docs',
  'help','login','logout','marketing','pricing','public','settings','signup',
  'static','status','support','terms','privacy','www','assets','_next','next',
  'cdn','health','about','accept-invite','leaderboard','store','cart','orders',
  'account','members','products','currency',
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export type SlugCheck =
  | { ok: true }
  | { ok: false; reason: 'too-short' | 'invalid' | 'reserved' };

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function validateSlugFormat(slug: string): SlugCheck {
  if (slug.length < 2) return { ok: false, reason: 'too-short' };
  if (!SLUG_RE.test(slug)) return { ok: false, reason: 'invalid' };
  if (RESERVED_SLUGS.has(slug)) return { ok: false, reason: 'reserved' };
  return { ok: true };
}
