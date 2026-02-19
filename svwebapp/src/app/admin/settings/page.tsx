"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateOrgSettings } from "./actions";

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
    </div>
  );
}
