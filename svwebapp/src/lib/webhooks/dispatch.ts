import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookEndpoints, webhookDeliveries } from "@/lib/db/schema";
import { signPayload } from "./sign";
import type { WebhookEvent } from "./events";

async function deliverWebhook(
  endpointId: string,
  tenantId: string,
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(payload);
  const signature = signPayload(body, secret, timestamp);

  // Create delivery record
  const [delivery] = await db
    .insert(webhookDeliveries)
    .values({
      tenantId,
      endpointId,
      event,
      payload,
      status: "pending",
      attempts: 1,
      lastAttemptAt: new Date(),
    })
    .returning({ id: webhookDeliveries.id });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SwagVault-Signature": signature,
        "X-SwagVault-Event": event,
        "X-SwagVault-Timestamp": String(timestamp),
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    const responseBody = await response.text().catch(() => "");

    await db
      .update(webhookDeliveries)
      .set({
        status: response.ok ? "success" : "failed",
        responseStatus: response.status,
        responseBody: responseBody.slice(0, 1000),
        ...(response.ok
          ? {}
          : { nextRetryAt: new Date(Date.now() + 60_000) }),
      })
      .where(eq(webhookDeliveries.id, delivery.id));
  } catch (err) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "failed",
        responseBody: err instanceof Error ? err.message : "Unknown error",
        nextRetryAt: new Date(Date.now() + 60_000),
      })
      .where(eq(webhookDeliveries.id, delivery.id));
  }
}

export function dispatchWebhookEvent(
  tenantId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  // Fire and forget — don't block the caller
  (async () => {
    try {
      const endpoints = await db
        .select()
        .from(webhookEndpoints)
        .where(
          and(
            eq(webhookEndpoints.tenantId, tenantId),
            eq(webhookEndpoints.isActive, true)
          )
        );

      for (const endpoint of endpoints) {
        const events = endpoint.events as string[] | null;
        if (!events?.includes(event)) continue;

        deliverWebhook(
          endpoint.id,
          tenantId,
          endpoint.url,
          endpoint.secret,
          event,
          { event, data: payload, timestamp: new Date().toISOString() }
        ).catch(() => {});
      }
    } catch {
      // Silently fail — webhook dispatch should never block the main flow
    }
  })();
}
