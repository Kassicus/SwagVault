"use server";

import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db/tenant";
import { webhookEndpoints, webhookDeliveries } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requirePlanFeature } from "@/lib/stripe/enforce";
import { generateWebhookSecret } from "@/lib/webhooks/sign";
import { webhookCreateSchema } from "@/lib/validators/api";
import { logAuditEvent } from "@/lib/audit/log";

export async function createWebhookEndpoint(formData: FormData) {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  const hasAccess = await requirePlanFeature(org.id, "apiAccess");
  if (!hasAccess) {
    return { success: false, error: "Webhooks require an Enterprise plan" };
  }

  const url = formData.get("url") as string;
  const eventsRaw = formData.get("events") as string;
  const events = eventsRaw ? JSON.parse(eventsRaw) as string[] : [];

  const parsed = webhookCreateSchema.safeParse({ url, events });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const secret = generateWebhookSecret();

  await withTenant(org.id, async (tx) => {
    await tx.insert(webhookEndpoints).values({
      tenantId: org.id,
      url: parsed.data.url,
      events: parsed.data.events,
      secret,
    });
  });

  logAuditEvent({ tenantId: org.id, userId: user.id, action: "webhook.created", resourceType: "webhook", metadata: { url: parsed.data.url } });

  revalidatePath("/admin/settings/webhooks");
  return { success: true, secret };
}

export async function toggleWebhookEndpoint(endpointId: string, isActive: boolean) {
  await requireAuth();
  const org = await getResolvedTenant();

  await withTenant(org.id, async (tx) => {
    await tx
      .update(webhookEndpoints)
      .set({ isActive })
      .where(
        and(
          eq(webhookEndpoints.id, endpointId),
          eq(webhookEndpoints.tenantId, org.id)
        )
      );
  });

  revalidatePath("/admin/settings/webhooks");
  return { success: true };
}

export async function deleteWebhookEndpoint(endpointId: string) {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  await withTenant(org.id, async (tx) => {
    await tx
      .delete(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.id, endpointId),
          eq(webhookEndpoints.tenantId, org.id)
        )
      );
  });

  logAuditEvent({ tenantId: org.id, userId: user.id, action: "webhook.deleted", resourceType: "webhook", resourceId: endpointId });

  revalidatePath("/admin/settings/webhooks");
  return { success: true };
}

export async function getWebhookEndpoints() {
  await requireAuth();
  const org = await getResolvedTenant();

  return withTenant(org.id, async (tx) => {
    return tx
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.tenantId, org.id))
      .orderBy(webhookEndpoints.createdAt);
  });
}

export async function getRecentDeliveries(endpointId: string) {
  await requireAuth();
  const org = await getResolvedTenant();

  return withTenant(org.id, async (tx) => {
    return tx
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.endpointId, endpointId),
          eq(webhookDeliveries.tenantId, org.id)
        )
      )
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(20);
  });
}
