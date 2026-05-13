'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart/store';

export function CartLink({ slug, orgId }: { slug: string; orgId: string }) {
  const cart = useCart(orgId);
  const count = cart.items.reduce((sum, i) => sum + i.qty, 0);
  return (
    <Link
      href={`/${slug}/cart`}
      className="relative flex items-center gap-1.5 px-2 py-1 text-muted-foreground hover:text-foreground"
    >
      Cart
      {/* Hydration mismatch is expected — SSR has cart=[], client reads localStorage. */}
      <span suppressHydrationWarning>
        {count > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center border-2 border-foreground bg-primary px-1 font-mono text-[10px] font-bold text-primary-foreground tabular-nums">
            {count}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
