"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createWebhookEndpoint,
  toggleWebhookEndpoint,
  deleteWebhookEndpoint,
  getWebhookEndpoints,
  getRecentDeliveries,
} from "./actions";
import { ALL_WEBHOOK_EVENTS } from "@/lib/webhooks/events";
import { formatRelativeTime } from "@/lib/utils";

interface Endpoint {
  id: string;
  url: string;
  events: string[] | null;
  isActive: boolean;
  createdAt: Date;
}

interface Delivery {
  id: string;
  event: string;
  status: string;
  attempts: number;
  responseStatus: number | null;
  createdAt: Date;
}

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  const loadEndpoints = useCallback(() => {
    startTransition(async () => {
      const data = await getWebhookEndpoints();
      setEndpoints(data);
    });
  }, []);

  useEffect(() => {
    loadEndpoints();
  }, [loadEndpoints]);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("events", JSON.stringify(selectedEvents));

    startTransition(async () => {
      const result = await createWebhookEndpoint(formData);
      if (result.success && result.secret) {
        setNewSecret(result.secret);
        setShowCreate(false);
        setSelectedEvents([]);
        loadEndpoints();
      } else {
        setError(result.error ?? "Failed to create endpoint");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this webhook endpoint?")) return;
    startTransition(async () => {
      await deleteWebhookEndpoint(id);
      loadEndpoints();
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleWebhookEndpoint(id, !isActive);
      loadEndpoints();
    });
  }

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  async function viewDeliveries(endpointId: string) {
    if (expandedEndpoint === endpointId) {
      setExpandedEndpoint(null);
      return;
    }
    setExpandedEndpoint(endpointId);
    const data = await getRecentDeliveries(endpointId);
    setDeliveries(data);
  }

  async function copySecret() {
    if (!newSecret) return;
    await navigator.clipboard.writeText(newSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-sm text-muted-foreground">
            Receive HTTP notifications when events happen. Enterprise plan required.
          </p>
        </div>
        <Button onClick={() => { setShowCreate(true); setNewSecret(null); }}>
          Add Endpoint
        </Button>
      </div>

      {/* New secret display */}
      {newSecret && (
        <Card className="mb-6 border-warning">
          <CardContent>
            <p className="mb-2 text-sm font-medium text-warning">
              Copy your webhook secret now. It won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                {newSecret}
              </code>
              <Button variant="outline" size="sm" onClick={copySecret}>
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
            <CardTitle>New Webhook Endpoint</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Input
                name="url"
                label="Endpoint URL"
                placeholder="https://example.com/webhook"
                type="url"
                required
              />
              <div>
                <label className="mb-2 block text-sm font-medium">Events</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_WEBHOOK_EVENTS.map((evt) => (
                    <label
                      key={evt.value}
                      className="flex items-center gap-2 rounded-md border border-border p-2 hover:bg-muted/30 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(evt.value)}
                        onChange={() => toggleEvent(evt.value)}
                      />
                      {evt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" loading={isPending}>
                  Create Endpoint
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Endpoints list */}
      {endpoints.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No webhook endpoints configured.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {endpoints.map((ep) => (
            <Card key={ep.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm">{ep.url}</code>
                      <Badge variant={ep.isActive ? "success" : "secondary"}>
                        {ep.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(ep.events as string[]).map((e) => (
                        <Badge key={e} variant="outline">{e}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {formatRelativeTime(ep.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewDeliveries(ep.id)}
                    >
                      {expandedEndpoint === ep.id ? "Hide Log" : "View Log"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(ep.id, ep.isActive)}
                      disabled={isPending}
                    >
                      {ep.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(ep.id)}
                      disabled={isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Delivery log */}
                {expandedEndpoint === ep.id && (
                  <div className="mt-3 rounded-md border border-border">
                    <div className="border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                      Recent Deliveries
                    </div>
                    {deliveries.length === 0 ? (
                      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                        No deliveries yet
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {deliveries.map((d) => (
                          <div key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  d.status === "success" ? "success" :
                                  d.status === "failed" ? "destructive" : "warning"
                                }
                              >
                                {d.status}
                              </Badge>
                              <span className="text-muted-foreground">{d.event}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {d.responseStatus && <span>HTTP {d.responseStatus}</span>}
                              <span>Attempt {d.attempts}</span>
                              <span>{formatRelativeTime(d.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
