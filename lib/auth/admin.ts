import type { SupabaseClient } from '@supabase/supabase-js';

// Look up a Supabase auth user by email. The admin API doesn't expose a
// direct lookup, so we paginate listUsers and scan. Capped at 5k users —
// for larger projects this needs a SQL helper function with an index.
export async function findUserByEmail(
  service: SupabaseClient,
  email: string,
): Promise<{ id: string } | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) return null;
    const found = data.users.find(
      (u) => (u.email ?? '').toLowerCase() === target,
    );
    if (found) return { id: found.id };
    if (data.users.length < 1000) return null;
  }
  return null;
}
