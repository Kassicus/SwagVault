import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

// Next.js 16 calls this `proxy.ts` (formerly `middleware.ts`). Runs as a
// Vercel Function on Fluid Compute.

const PUBLIC_TOP_LEVEL = new Set([
  'login',
  'signup',
  'logout',
  'api',
  'accept-invite',
  '_next',
  'favicon.ico',
]);

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refreshes the session if needed; sets cookies on `res`.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const firstSegment = path.split('/')[1] ?? '';

  // Webhooks are unconditionally public (signature-verified).
  if (path.startsWith('/api/webhooks/')) return res;

  // Skip non-org top-level paths.
  if (firstSegment === '' || PUBLIC_TOP_LEVEL.has(firstSegment)) {
    return res;
  }

  // This is /<orgSlug>/...
  const slug = firstSegment;

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // One join query: does the current user have a membership in this org?
  const { data: m } = await supabase
    .from('memberships')
    .select('role, organizations!inner(slug, subscription_status)')
    .eq('user_id', user.id)
    .eq('organizations.slug', slug)
    .maybeSingle();

  if (!m) {
    // Either the org doesn't exist or the user isn't in it. Same UX: 404.
    const url = req.nextUrl.clone();
    url.pathname = '/404';
    return NextResponse.rewrite(url);
  }

  const org = m.organizations as unknown as {
    slug: string;
    subscription_status: Database['public']['Tables']['organizations']['Row']['subscription_status'];
  };

  const subActive =
    org.subscription_status === 'active' ||
    org.subscription_status === 'trialing';

  if (!subActive) {
    const allowedWhilePastDue =
      path === `/${slug}/subscription-required` ||
      path.startsWith(`/${slug}/admin/billing`) ||
      path === `/${slug}/admin`;
    if (!allowedWhilePastDue) {
      const url = req.nextUrl.clone();
      url.pathname = `/${slug}/subscription-required`;
      return NextResponse.redirect(url);
    }
  }

  // Member trying to hit admin area → bounce to storefront.
  if (path.startsWith(`/${slug}/admin`) && m.role === 'member') {
    const url = req.nextUrl.clone();
    url.pathname = `/${slug}`;
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // Run on every path except Next.js internals + static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
