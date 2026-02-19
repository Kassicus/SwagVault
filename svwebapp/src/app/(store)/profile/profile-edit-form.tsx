"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "./actions";

export function ProfileEditForm({ currentName }: { currentName: string }) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error ?? "Failed to update profile");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="rounded-md bg-success/10 p-3 text-sm text-success">
          Profile updated!
        </div>
      )}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <Input
        id="displayName"
        name="displayName"
        label="Display Name"
        defaultValue={currentName}
        required
        minLength={2}
      />
      <Button type="submit" size="sm" loading={isPending}>
        Save
      </Button>
    </form>
  );
}
