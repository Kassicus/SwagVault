"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateOrgSettings, updateSsoSettings } from "./actions";

const settingsNav = [
  {
    title: "API Keys",
    description: "Manage programmatic API access",
    href: "/admin/settings/api-keys",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
  },
  {
    title: "Webhooks",
    description: "Configure event notifications",
    href: "/admin/settings/webhooks",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    title: "Integrations",
    description: "Slack and Teams notifications",
    href: "/admin/settings/integrations",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.464 8.97" />
      </svg>
    ),
  },
];

export default function SettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateOrgSettings(formData);
      if (result.success) {
        setSuccess(true);
      }
    });
  }

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization settings
        </p>
      </div>

      {/* Navigation cards */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        {settingsNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-lg border border-border p-4 transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            <div className="mb-2 text-muted-foreground group-hover:text-primary">
              {item.icon}
            </div>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </Link>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {success && (
          <div className="rounded-md bg-success/10 p-3 text-sm text-success">
            Settings saved!
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              id="name"
              name="name"
              label="Organization Name"
              placeholder="Acme Corp"
            />
            <Input
              id="primaryColor"
              name="primaryColor"
              label="Brand Color"
              type="color"
              defaultValue="#c9a84c"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Currency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              id="currencyName"
              name="currencyName"
              label="Currency Name"
              placeholder="Credits"
            />
            <Input
              id="currencySymbol"
              name="currencySymbol"
              label="Currency Symbol"
              placeholder="C"
              maxLength={10}
            />
          </CardContent>
        </Card>

        <Button type="submit" loading={isPending}>
          Save Settings
        </Button>
      </form>

      {/* SSO Configuration (Enterprise only) */}
      <SsoConfigCard />
    </div>
  );
}

function SsoConfigCard() {
  const [isPending, startTransition] = useTransition();
  const [ssoSuccess, setSsoSuccess] = useState(false);

  function handleSsoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSsoSuccess(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateSsoSettings(formData);
      if (result.success) setSsoSuccess(true);
    });
  }

  useEffect(() => {
    if (ssoSuccess) {
      const timer = setTimeout(() => setSsoSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [ssoSuccess]);

  return (
    <form onSubmit={handleSsoSubmit} className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Single Sign-On (SSO)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ssoSuccess && (
            <div className="rounded-md bg-success/10 p-3 text-sm text-success">
              SSO settings saved!
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Configure Microsoft Entra ID for your organization. Enterprise plan required.
          </p>
          <Input
            id="ssoTenantId"
            name="ssoTenantId"
            label="Microsoft Tenant ID"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
          <Button type="submit" loading={isPending}>
            Save SSO Settings
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
