'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart/store';

export function CartLink({ slug, orgId }: { slug: string; orgId: string }) {
  const cart = useCart(orgId);
  const count = cart.items.reduce((sum, i) => sum + i.qty, 0);
  return (
    <Link
      href={`/${slug}/cart`}
      className="relative text-sm text-muted-foreground hover:text-foreground"
    >
      Cart
      {/* Hydration mismatch is expected — SSR has cart=[], client reads localStorage. */}
      <span suppressHydrationWarning>
        {count > 0 ? (
          <span className="ml-1 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background tabular-nums">
            {count}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
