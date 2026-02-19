import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { sendSlackNotification } from "./slack";
import { sendTeamsNotification } from "./teams";
import type { WebhookEvent } from "@/lib/webhooks/events";

const EVENT_LABELS: Record<string, string> = {
  "order.created": "New Order",
  "order.status_changed": "Order Status Changed",
  "user.credited": "Currency Credited",
  "user.debited": "Currency Debited",
  "member.joined": "New Member",
  "item.created": "New Item",
  "item.updated": "Item Updated",
};

function buildMessage(event: WebhookEvent, payload: Record<string, unknown>) {
  const title = EVENT_LABELS[event] ?? event;
  const details = Object.entries(payload)
    .map(([k, v]) => `*${k}:* ${String(v)}`)
    .join("\n");
  return { title, text: details || "No additional details." };
}

export function dispatchIntegrationNotifications(
  tenantId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  // Fire and forget
  (async () => {
    try {
      const rows = await db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.tenantId, tenantId),
            eq(integrations.isActive, true)
          )
        );

      const message = buildMessage(event, payload);

      for (const integration of rows) {
        const url = (integration.config as { webhookUrl: string }).webhookUrl;
        if (integration.type === "slack") {
          sendSlackNotification(url, message).catch(() => {});
        } else if (integration.type === "teams") {
          sendTeamsNotification(url, message).catch(() => {});
        }
      }
    } catch {
      // Silent failure
    }
  })();
}
