"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile, removeAvatar } from "./actions";

type Props = {
  currentName: string;
  currentAvatarUrl: string | null;
};

export function ProfileEditForm({ currentName, currentAvatarUrl }: Props) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayedAvatar = previewUrl ?? currentAvatarUrl;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    setError("");
    const formData = new FormData(e.currentTarget);

    if (selectedFile) {
      formData.set("avatar", selectedFile);
    }

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.success) {
        setSuccess(true);
        setSelectedFile(null);
        setPreviewUrl(null);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error ?? "Failed to update profile");
      }
    });
  }

  function handleRemoveAvatar() {
    setSuccess(false);
    setError("");
    startTransition(async () => {
      const result = await removeAvatar();
      if (result.success) {
        setPreviewUrl(null);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError("Failed to remove avatar");
      }
    });
  }

  const initials = currentName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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

      {/* Avatar section */}
      <div className="flex items-center gap-4">
        {displayedAvatar ? (
          <Image
            src={displayedAvatar}
            alt="Avatar"
            width={64}
            height={64}
            className="size-16 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
            {initials}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Photo
          </Button>
          {(currentAvatarUrl || previewUrl) && (
            <button
              type="button"
              className="text-xs text-destructive hover:underline"
              onClick={handleRemoveAvatar}
              disabled={isPending}
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

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
