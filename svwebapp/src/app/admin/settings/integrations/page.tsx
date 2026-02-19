"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getIntegrations,
  saveIntegration,
  toggleIntegration,
  deleteIntegration,
  testIntegration,
} from "./actions";

interface IntegrationRow {
  id: string;
  type: string;
  config: { webhookUrl: string };
  isActive: boolean;
}

export default function IntegrationsPage() {
  const [existing, setExisting] = useState<IntegrationRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [slackUrl, setSlackUrl] = useState("");
  const [teamsUrl, setTeamsUrl] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadIntegrations = useCallback(() => {
    startTransition(async () => {
      const data = await getIntegrations();
      setExisting(data as IntegrationRow[]);
      const slack = data.find((d) => d.type === "slack");
      const teams = data.find((d) => d.type === "teams");
      if (slack) setSlackUrl((slack.config as { webhookUrl: string }).webhookUrl);
      if (teams) setTeamsUrl((teams.config as { webhookUrl: string }).webhookUrl);
    });
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  function handleSave(type: "slack" | "teams") {
    const url = type === "slack" ? slackUrl : teamsUrl;
    if (!url.trim()) return;
    startTransition(async () => {
      const result = await saveIntegration(type, url.trim());
      if (result.success) {
        setMessage({ type: "success", text: `${type === "slack" ? "Slack" : "Teams"} integration saved` });
        loadIntegrations();
      }
    });
  }

  function handleTest(type: "slack" | "teams") {
    const url = type === "slack" ? slackUrl : teamsUrl;
    if (!url.trim()) return;
    startTransition(async () => {
      const result = await testIntegration(type, url.trim());
      if (result.success) {
        setMessage({ type: "success", text: "Test message sent!" });
      } else {
        setMessage({ type: "error", text: result.error ?? "Test failed" });
      }
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleIntegration(id, !isActive);
      loadIntegrations();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Remove this integration?")) return;
    startTransition(async () => {
      await deleteIntegration(id);
      loadIntegrations();
    });
  }

  const slackIntegration = existing.find((e) => e.type === "slack");
  const teamsIntegration = existing.find((e) => e.type === "teams");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect SwagVault to Slack and Microsoft Teams for real-time notifications.
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Slack */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Slack</CardTitle>
                <CardDescription>
                  Send notifications to a Slack channel via incoming webhook
                </CardDescription>
              </div>
              {slackIntegration && (
                <Badge variant={slackIntegration.isActive ? "success" : "secondary"}>
                  {slackIntegration.isActive ? "Active" : "Inactive"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              label="Webhook URL"
              placeholder="https://hooks.slack.com/services/..."
              value={slackUrl}
              onChange={(e) => setSlackUrl(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleSave("slack")}
                loading={isPending}
                disabled={!slackUrl.trim()}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTest("slack")}
                disabled={isPending || !slackUrl.trim()}
              >
                Test
              </Button>
              {slackIntegration && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggle(slackIntegration.id, slackIntegration.isActive)}
                    disabled={isPending}
                  >
                    {slackIntegration.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(slackIntegration.id)}
                    disabled={isPending}
                  >
                    Remove
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Teams */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Microsoft Teams</CardTitle>
                <CardDescription>
                  Send notifications to a Teams channel via incoming webhook
                </CardDescription>
              </div>
              {teamsIntegration && (
                <Badge variant={teamsIntegration.isActive ? "success" : "secondary"}>
                  {teamsIntegration.isActive ? "Active" : "Inactive"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              label="Webhook URL"
              placeholder="https://outlook.office.com/webhook/..."
              value={teamsUrl}
              onChange={(e) => setTeamsUrl(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleSave("teams")}
                loading={isPending}
                disabled={!teamsUrl.trim()}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTest("teams")}
                disabled={isPending || !teamsUrl.trim()}
              >
                Test
              </Button>
              {teamsIntegration && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggle(teamsIntegration.id, teamsIntegration.isActive)}
                    disabled={isPending}
                  >
                    {teamsIntegration.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(teamsIntegration.id)}
                    disabled={isPending}
                  >
                    Remove
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
