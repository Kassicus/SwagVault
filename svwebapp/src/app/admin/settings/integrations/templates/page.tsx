"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  WEBHOOK_PAYLOAD_EXAMPLES,
  ZAPIER_SETUP_STEPS,
  N8N_SETUP_STEPS,
  SIGNATURE_VERIFICATION_SNIPPET,
  N8N_VERIFICATION_SNIPPET,
} from "@/lib/webhooks/templates";

export default function WebhookTemplatesPage() {
  const [activeTab, setActiveTab] = useState<"zapier" | "n8n">("zapier");
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopiedSnippet(label);
    setTimeout(() => setCopiedSnippet(null), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Automation Templates</h1>
        <p className="text-sm text-muted-foreground">
          Connect SwagVault webhooks to Zapier, n8n, and other automation platforms.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab("zapier")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "zapier"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Zapier
        </button>
        <button
          onClick={() => setActiveTab("n8n")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "n8n"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          n8n
        </button>
      </div>

      <div className="space-y-6">
        {/* Setup guide */}
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "zapier" ? "Zapier" : "n8n"} Setup Guide
            </CardTitle>
            <CardDescription>
              {activeTab === "zapier"
                ? "Use Webhooks by Zapier to trigger automated workflows from SwagVault events."
                : "Use n8n's Webhook trigger node to build custom workflows from SwagVault events."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {(activeTab === "zapier" ? ZAPIER_SETUP_STEPS : N8N_SETUP_STEPS).map(
                (step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {i + 1}
                    </span>
                    <span
                      className="text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: step }}
                    />
                  </li>
                )
              )}
            </ol>
          </CardContent>
        </Card>

        {/* Signature verification */}
        <Card>
          <CardHeader>
            <CardTitle>Signature Verification</CardTitle>
            <CardDescription>
              Verify that incoming webhooks are genuinely from SwagVault by checking the HMAC-SHA256 signature.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {activeTab === "zapier"
                  ? "Use this in a Zapier Code step or your own backend:"
                  : "Add this as a Code node after your Webhook trigger:"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    activeTab === "zapier"
                      ? SIGNATURE_VERIFICATION_SNIPPET
                      : N8N_VERIFICATION_SNIPPET,
                    "snippet"
                  )
                }
              >
                {copiedSnippet === "snippet" ? "Copied!" : "Copy"}
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs font-mono leading-relaxed">
              {activeTab === "zapier"
                ? SIGNATURE_VERIFICATION_SNIPPET
                : N8N_VERIFICATION_SNIPPET}
            </pre>
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium">Headers sent with each webhook:</p>
              <ul className="mt-1 space-y-0.5">
                <li>
                  <code>X-SwagVault-Signature</code> — HMAC-SHA256 signature
                  (format: <code>sha256=&lt;hex&gt;</code>)
                </li>
                <li>
                  <code>X-SwagVault-Event</code> — Event type (e.g.{" "}
                  <code>order.created</code>)
                </li>
                <li>
                  <code>X-SwagVault-Timestamp</code> — Unix timestamp of when
                  the webhook was sent
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Example payloads */}
        <Card>
          <CardHeader>
            <CardTitle>Event Payloads</CardTitle>
            <CardDescription>
              Example payloads for each webhook event. Use these to configure
              your {activeTab === "zapier" ? "Zap" : "workflow"} field mappings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {WEBHOOK_PAYLOAD_EXAMPLES.map((example) => (
              <div
                key={example.event}
                className="rounded-md border border-border"
              >
                <button
                  onClick={() =>
                    setExpandedEvent(
                      expandedEvent === example.event ? null : example.event
                    )
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{example.event}</Badge>
                    <span className="text-sm">{example.label}</span>
                  </div>
                  <svg
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      expandedEvent === example.event ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>
                {expandedEvent === example.event && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="mb-2 text-xs text-muted-foreground">
                      {example.description}
                    </p>
                    <div className="flex items-start justify-between gap-2">
                      <pre className="flex-1 overflow-x-auto rounded bg-muted p-3 text-xs font-mono">
                        {JSON.stringify(example.examplePayload, null, 2)}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify(example.examplePayload, null, 2),
                            example.event
                          )
                        }
                      >
                        {copiedSnippet === example.event ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Common recipes */}
        <Card>
          <CardHeader>
            <CardTitle>
              Common {activeTab === "zapier" ? "Zaps" : "Workflows"}
            </CardTitle>
            <CardDescription>
              Popular automation ideas to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(activeTab === "zapier" ? ZAPIER_RECIPES : N8N_RECIPES).map(
                (recipe, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-md border border-border p-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm">
                      {recipe.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{recipe.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {recipe.description}
                      </p>
                      <div className="mt-1 flex gap-1">
                        {recipe.events.map((e) => (
                          <Badge key={e} variant="outline" className="text-[10px]">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const ZAPIER_RECIPES = [
  {
    icon: "📊",
    title: "Log orders to Google Sheets",
    description:
      "When an order is created, add a row to a Google Sheet with the order number, user, and total.",
    events: ["order.created"],
  },
  {
    icon: "📧",
    title: "Email manager on high-value orders",
    description:
      "When an order over a certain amount is placed, send an email notification to the fulfillment team.",
    events: ["order.created"],
  },
  {
    icon: "🎟️",
    title: "Create Jira ticket for fulfillment",
    description:
      "When an order status changes to approved, create a Jira ticket for the ops team to fulfill it.",
    events: ["order.status_changed"],
  },
  {
    icon: "👋",
    title: "Welcome new members in Slack",
    description:
      "When a new member joins, post a welcome message to your team's Slack channel.",
    events: ["member.joined"],
  },
  {
    icon: "💰",
    title: "Sync credits to external HR system",
    description:
      "When currency is credited, send the data to your HR/rewards platform via an HTTP request.",
    events: ["user.credited"],
  },
];

const N8N_RECIPES = [
  {
    icon: "📊",
    title: "Log orders to a database",
    description:
      "When an order is created, insert a record into Postgres, MySQL, or Airtable for reporting.",
    events: ["order.created"],
  },
  {
    icon: "📧",
    title: "Send fulfillment emails",
    description:
      "When an order is approved, send a custom email to the member with order details.",
    events: ["order.status_changed"],
  },
  {
    icon: "🔄",
    title: "Sync members to CRM",
    description:
      "When a new member joins, create or update a contact in HubSpot, Salesforce, or Pipedrive.",
    events: ["member.joined"],
  },
  {
    icon: "💬",
    title: "Post to Discord on new items",
    description:
      "When a new item is added to the catalog, announce it in a Discord channel via webhook.",
    events: ["item.created"],
  },
  {
    icon: "📈",
    title: "Track currency distribution in a spreadsheet",
    description:
      "When credits are distributed, append a row to Google Sheets with user, amount, and reason.",
    events: ["user.credited"],
  },
];
