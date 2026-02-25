"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BalancePill } from "./balance-pill";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface StoreMobileNavProps {
  qs: string;
  balance: number;
  currencySymbol: string;
  isAdmin: boolean;
  displayName: string;
  orgName: string;
}

export function StoreMobileNav({
  qs,
  balance,
  currencySymbol,
  isAdmin,
  displayName,
  orgName,
}: StoreMobileNavProps) {
  const [open, setOpen] = useState(false);

  // Close drawer on escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { href: `/${qs}`, label: "Catalog" },
    { href: `/orders${qs}`, label: "Orders" },
    { href: `/cart${qs}`, label: "Cart" },
    ...(isAdmin
      ? [{ href: `/admin/dashboard${qs}`, label: "Admin" }]
      : []),
    { href: `/profile${qs}`, label: "Profile" },
  ];

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Backdrop + Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <nav className="absolute right-0 top-0 h-full w-72 bg-card shadow-xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="text-lg font-bold">{orgName}</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <div className="px-4 py-4">
              <BalancePill balance={balance} currencySymbol={currencySymbol} />
            </div>

            <ul className="space-y-1 px-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-border px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{displayName}</span>
                <ThemeToggle />
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
