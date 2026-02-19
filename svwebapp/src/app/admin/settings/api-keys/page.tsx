"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createApiKey, deleteApiKey } from "./actions";
import { API_PERMISSIONS } from "@/lib/validators/api";
import { formatRelativeTime } from "@/lib/utils";

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(() => {
    fetch("/api/internal/api-keys")
      .then((r) => r.json())
      .then((data) => {
        if (data.keys) setKeys(data.keys);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("permissions", JSON.stringify(selectedPerms));

    startTransition(async () => {
      const result = await createApiKey(formData);
      if (result.success && result.rawKey) {
        setNewRawKey(result.rawKey);
        setShowCreate(false);
        setSelectedPerms([]);
        loadKeys();
      } else {
        setError(result.error ?? "Failed to create key");
      }
    });
  }

  function handleDelete(keyId: string) {
    if (!confirm("Delete this API key? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteApiKey(keyId);
      loadKeys();
    });
  }

  function togglePerm(perm: string) {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  async function copyKey() {
    if (!newRawKey) return;
    await navigator.clipboard.writeText(newRawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-sm text-muted-foreground">
            Manage API keys for programmatic access. Enterprise plan required.
          </p>
        </div>
        <Button onClick={() => { setShowCreate(true); setNewRawKey(null); }}>
          Create Key
        </Button>
      </div>

      {/* New key display */}
      {newRawKey && (
        <Card className="mb-6 border-warning">
          <CardContent>
            <p className="mb-2 text-sm font-medium text-warning">
              Copy your API key now. It won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                {newRawKey}
              </code>
              <Button variant="outline" size="sm" onClick={copyKey}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {showCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create API Key</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Input
                name="name"
                label="Key Name"
                placeholder="e.g. CI/CD Pipeline"
                required
              />
              <div>
                <label className="mb-2 block text-sm font-medium">Permissions</label>
                <div className="space-y-2">
                  {API_PERMISSIONS.map((perm) => (
                    <label
                      key={perm.value}
                      className="flex items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/30 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPerms.includes(perm.value)}
                        onChange={() => togglePerm(perm.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium">{perm.label}</p>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" loading={isPending}>
                  Create Key
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No API keys yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card key={key.id}>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{key.name}</p>
                    <code className="text-xs text-muted-foreground">
                      {key.keyPrefix}...
                    </code>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {key.permissions.map((p) => (
                      <Badge key={p} variant="secondary">{p}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {key.lastUsedAt
                      ? `Last used ${formatRelativeTime(key.lastUsedAt)}`
                      : "Never used"}
                    {" · "}
                    Created {formatRelativeTime(key.createdAt)}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(key.id)}
                  disabled={isPending}
                >
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
