"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import Link from "next/link";
import { loginAction, ssoLoginAction } from "./actions";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const tenant = searchParams.get("tenant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  // Build redirect URL preserving tenant param for dev mode
  const redirectTo = tenant
    ? `${callbackUrl}${callbackUrl.includes("?") ? "&" : "?"}tenant=${tenant}`
    : callbackUrl;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsPending(true);

    try {
      const result = await loginAction({ email, password });

      if (result.success) {
        // If we already have an explicit callbackUrl (not default), use it
        if (callbackUrl !== "/" && tenant) {
          window.location.href = redirectTo;
        } else if (result.orgSlug) {
          // Redirect admins/owners to dashboard, members to store
          const isAdmin = ["owner", "admin", "manager"].includes(result.role ?? "");
          const dest = isAdmin
            ? `/admin/dashboard?tenant=${result.orgSlug}`
            : `/?tenant=${result.orgSlug}`;
          window.location.href = dest;
        } else {
          window.location.href = "/";
        }
      } else {
        setError(result.error ?? "Invalid email or password");
        setIsPending(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to access your vault
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Button type="submit" className="w-full" loading={isPending}>
            Sign in
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <form action={ssoLoginAction}>
          <input type="hidden" name="tenant" value={tenant ?? ""} />
          <Button type="submit" variant="outline" className="w-full">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Sign in with Microsoft
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an organization?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
