import { eq, and, lte, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookDeliveries, webhookEndpoints } from "@/lib/db/schema";
import { signPayload } from "./sign";

const MAX_ATTEMPTS = 3;
const BACKOFF_DELAYS = [60_000, 300_000, 1_800_000]; // 1m, 5m, 30m

export async function processWebhookRetries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const now = new Date();

  const pending = await db
    .select({
      delivery: webhookDeliveries,
      endpointUrl: webhookEndpoints.url,
      endpointSecret: webhookEndpoints.secret,
    })
    .from(webhookDeliveries)
    .innerJoin(
      webhookEndpoints,
      eq(webhookDeliveries.endpointId, webhookEndpoints.id)
    )
    .where(
      and(
        eq(webhookDeliveries.status, "failed"),
        lte(webhookDeliveries.nextRetryAt, now),
        lt(webhookDeliveries.attempts, MAX_ATTEMPTS)
      )
    )
    .limit(50);

  let succeeded = 0;
  let failed = 0;

  for (const { delivery, endpointUrl, endpointSecret } of pending) {
    const attempt = delivery.attempts + 1;
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify(delivery.payload);
    const signature = signPayload(body, endpointSecret, timestamp);

    try {
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SwagVault-Signature": signature,
          "X-SwagVault-Event": delivery.event,
          "X-SwagVault-Timestamp": String(timestamp),
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      const responseBody = await response.text().catch(() => "");

      if (response.ok) {
        await db
          .update(webhookDeliveries)
          .set({
            status: "success",
            attempts: attempt,
            lastAttemptAt: new Date(),
            nextRetryAt: null,
            responseStatus: response.status,
            responseBody: responseBody.slice(0, 1000),
          })
          .where(eq(webhookDeliveries.id, delivery.id));
        succeeded++;
      } else {
        const nextDelay = BACKOFF_DELAYS[attempt - 1] ?? BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
        await db
          .update(webhookDeliveries)
          .set({
            attempts: attempt,
            lastAttemptAt: new Date(),
            nextRetryAt: attempt >= MAX_ATTEMPTS ? null : new Date(Date.now() + nextDelay),
            responseStatus: response.status,
            responseBody: responseBody.slice(0, 1000),
          })
          .where(eq(webhookDeliveries.id, delivery.id));
        failed++;
      }
    } catch (err) {
      const nextDelay = BACKOFF_DELAYS[attempt - 1] ?? BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
      await db
        .update(webhookDeliveries)
        .set({
          attempts: attempt,
          lastAttemptAt: new Date(),
          nextRetryAt: attempt >= MAX_ATTEMPTS ? null : new Date(Date.now() + nextDelay),
          responseBody: err instanceof Error ? err.message : "Unknown error",
        })
        .where(eq(webhookDeliveries.id, delivery.id));
      failed++;
    }
  }

  return { processed: pending.length, succeeded, failed };
}
