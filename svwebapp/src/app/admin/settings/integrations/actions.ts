"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db/tenant";
import { integrations } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { logAuditEvent } from "@/lib/audit/log";
import { sendSlackNotification } from "@/lib/integrations/slack";
import { sendTeamsNotification } from "@/lib/integrations/teams";

export async function getIntegrations() {
  await requireAuth();
  const org = await getResolvedTenant();

  return withTenant(org.id, async (tx) => {
    return tx
      .select()
      .from(integrations)
      .where(eq(integrations.tenantId, org.id));
  });
}

export async function saveIntegration(
  type: "slack" | "teams",
  webhookUrl: string
) {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  // Check if integration of this type already exists
  const existing = await withTenant(org.id, async (tx) => {
    const [row] = await tx
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.tenantId, org.id),
          eq(integrations.type, type)
        )
      );
    return row;
  });

  if (existing) {
    await withTenant(org.id, async (tx) => {
      await tx
        .update(integrations)
        .set({ config: { webhookUrl }, updatedAt: new Date() })
        .where(eq(integrations.id, existing.id));
    });
  } else {
    await withTenant(org.id, async (tx) => {
      await tx.insert(integrations).values({
        tenantId: org.id,
        type,
        config: { webhookUrl },
      });
    });
  }

  logAuditEvent({
    tenantId: org.id,
    userId: user.id,
    action: "integration.updated",
    resourceType: "integration",
    metadata: { type },
  });

  revalidatePath("/admin/settings/integrations");
  return { success: true };
}

export async function toggleIntegration(integrationId: string, isActive: boolean) {
  await requireAuth();
  const org = await getResolvedTenant();

  await withTenant(org.id, async (tx) => {
    await tx
      .update(integrations)
      .set({ isActive, updatedAt: new Date() })
      .where(
        and(
          eq(integrations.id, integrationId),
          eq(integrations.tenantId, org.id)
        )
      );
  });

  revalidatePath("/admin/settings/integrations");
  return { success: true };
}

export async function deleteIntegration(integrationId: string) {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  await withTenant(org.id, async (tx) => {
    await tx
      .delete(integrations)
      .where(
        and(
          eq(integrations.id, integrationId),
          eq(integrations.tenantId, org.id)
        )
      );
  });

  logAuditEvent({
    tenantId: org.id,
    userId: user.id,
    action: "integration.deleted",
    resourceType: "integration",
    resourceId: integrationId,
  });

  revalidatePath("/admin/settings/integrations");
  return { success: true };
}

export async function testIntegration(type: "slack" | "teams", webhookUrl: string) {
  const message = {
    title: "SwagVault Test Notification",
    text: "If you see this message, your integration is working correctly!",
  };

  let success: boolean;
  if (type === "slack") {
    success = await sendSlackNotification(webhookUrl, message);
  } else {
    success = await sendTeamsNotification(webhookUrl, message);
  }

  return { success, error: success ? null : "Failed to send test message" };
}
