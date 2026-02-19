"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import {
  createAccount,
  createOrganization,
  configureCurrency,
  checkSlugAvailability,
  signInAfterSignup,
} from "./actions";
import { slugify } from "@/lib/utils";

type Step = "account" | "organization" | "currency" | "done";

export default function SignupPage() {
  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Account state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [userId, setUserId] = useState("");

  // Org state
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [orgId, setOrgId] = useState("");

  // Currency state
  const [currencyName, setCurrencyName] = useState("Credits");
  const [currencySymbol, setCurrencySymbol] = useState("C");

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await createAccount({ email, password, displayName });
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Failed to create account");
      return;
    }

    setUserId(result.userId!);
    setStep("organization");
  }

  async function handleSlugChange(value: string) {
    const s = slugify(value);
    setSlug(s);
    if (s.length >= 3) {
      const result = await checkSlugAvailability(s);
      setSlugAvailable(result.available);
    } else {
      setSlugAvailable(null);
    }
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await createOrganization({ userId, name: orgName, slug });
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Failed to create organization");
      return;
    }

    setOrgId(result.orgId!);
    setStep("currency");
  }

  async function handleConfigureCurrency(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await configureCurrency({
      orgId,
      currencyName,
      currencySymbol,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Failed to configure currency");
      return;
    }

    // Sign in and redirect
    await signInAfterSignup(userId, email, displayName);
    setStep("done");
  }

  function handleGoToDashboard() {
    const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "getswagvault.com";
    if (domain.includes("localhost") || domain.includes("127.0.0.1")) {
      window.location.href = `/admin/dashboard?tenant=${slug}`;
    } else {
      window.location.href = `https://${slug}.${domain}/admin/dashboard`;
    }
  }

  const stepNumber = { account: 1, organization: 2, currency: 3, done: 4 };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8">
        <Logo size="lg" />
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                stepNumber[step] >= n
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {stepNumber[step] > n ? (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                n
              )}
            </div>
            {n < 3 && (
              <div
                className={`h-0.5 w-12 ${
                  stepNumber[step] > n ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="w-full max-w-md">
        {step === "account" && (
          <Card>
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>
                Start by setting up your personal account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Input
                  id="displayName"
                  label="Display Name"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
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
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "organization" && (
          <Card>
            <CardHeader>
              <CardTitle>Create your organization</CardTitle>
              <CardDescription>
                Set up your branded SwagVault store
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOrg} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Input
                  id="orgName"
                  label="Organization Name"
                  placeholder="Acme Corp"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    handleSlugChange(e.target.value);
                  }}
                  required
                />
                <div>
                  <Input
                    id="slug"
                    label="Store URL"
                    placeholder="acme"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    required
                    minLength={3}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {slug ? `${slug}.getswagvault.com` : "your-org.getswagvault.com"}
                  </p>
                  {slugAvailable === true && slug.length >= 3 && (
                    <p className="mt-1 text-xs text-success">Available!</p>
                  )}
                  {slugAvailable === false && (
                    <p className="mt-1 text-xs text-destructive">
                      This slug is already taken
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={slugAvailable === false}
                >
                  Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "currency" && (
          <Card>
            <CardHeader>
              <CardTitle>Configure your currency</CardTitle>
              <CardDescription>
                Name the currency your members will earn and spend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfigureCurrency} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Input
                  id="currencyName"
                  label="Currency Name"
                  placeholder="Credits"
                  value={currencyName}
                  onChange={(e) => setCurrencyName(e.target.value)}
                  required
                />
                <Input
                  id="currencySymbol"
                  label="Currency Symbol"
                  placeholder="C"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  required
                  maxLength={10}
                />
                <p className="text-sm text-muted-foreground">
                  Preview: <span className="font-semibold text-foreground">{currencySymbol}100</span>
                </p>
                <Button type="submit" className="w-full" loading={loading}>
                  Finish setup
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card className="text-center">
            <CardContent className="py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <svg
                  className="h-8 w-8 text-success"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Your Vault is ready!</h2>
              <p className="mt-2 text-muted-foreground">
                Your organization <strong>{orgName}</strong> has been created.
              </p>
              <Button
                className="mt-6"
                size="lg"
                onClick={handleGoToDashboard}
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
