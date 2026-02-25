import Link from "next/link";
import { BalancePill } from "./balance-pill";
import { StoreMobileNav } from "./mobile-nav";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface StoreHeaderProps {
  orgName: string;
  orgLogoUrl: string | null;
  qs: string;
  balance: number;
  currencySymbol: string;
  isAdmin: boolean;
  displayName: string;
}

export function StoreHeader({
  orgName,
  orgLogoUrl,
  qs,
  balance,
  currencySymbol,
  isAdmin,
  displayName,
}: StoreHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href={`/${qs}`}>
            {orgLogoUrl ? (
              <img
                src={orgLogoUrl}
                alt={orgName}
                className="h-8 w-8 rounded-md object-cover"
              />
            ) : (
              <span className="text-lg font-bold">{orgName}</span>
            )}
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            <Link
              href={`/${qs}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Catalog
            </Link>
            <Link
              href={`/orders${qs}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Orders
            </Link>
            <Link
              href={`/cart${qs}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Cart
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <BalancePill
            balance={balance}
            currencySymbol={currencySymbol}
            className="hidden md:inline-flex"
          />
          {isAdmin && (
            <Link
              href={`/admin/dashboard${qs}`}
              className="hidden rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 md:inline-flex"
            >
              Admin
            </Link>
          )}
          <div className="hidden md:flex md:items-center md:gap-4">
            <ThemeToggle />
            <Link
              href={`/profile${qs}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {displayName}
            </Link>
          </div>
          <StoreMobileNav
            qs={qs}
            balance={balance}
            currencySymbol={currencySymbol}
            isAdmin={isAdmin}
            displayName={displayName}
            orgName={orgName}
          />
        </div>
      </div>
    </header>
  );
}
