"use server";

import { revalidatePath } from "next/cache";
import { creditUser, bulkDistribute } from "@/lib/currency/engine";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatch";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";
import { logAuditEvent } from "@/lib/audit/log";
import { dispatchIntegrationNotifications } from "@/lib/integrations/dispatch";

export async function distributeCurrency(formData: FormData) {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  const userIdsRaw = formData.get("userIds") as string;
  const amount = Number(formData.get("amount"));
  const reason = (formData.get("reason") as string) || "Admin distribution";

  if (!userIdsRaw || !amount || amount <= 0) {
    return { success: false, error: "Invalid input" };
  }

  const userIds = JSON.parse(userIdsRaw) as string[];

  if (userIds.length === 0) {
    return { success: false, error: "Select at least one user" };
  }

  try {
    if (userIds.length === 1) {
      await creditUser(org.id, userIds[0], amount, reason, user.id);
    } else {
      await bulkDistribute(org.id, userIds, amount, reason, user.id);
    }

    // Audit + webhook + integrations (non-blocking)
    logAuditEvent({ tenantId: org.id, userId: user.id, action: "currency.distributed", resourceType: "currency", metadata: { userIds, amount, reason } });
    for (const uid of userIds) {
      const eventPayload = { userId: uid, amount, reason };
      dispatchWebhookEvent(org.id, WEBHOOK_EVENTS.USER_CREDITED, eventPayload);
      dispatchIntegrationNotifications(org.id, WEBHOOK_EVENTS.USER_CREDITED, eventPayload);
    }

    revalidatePath("/admin/currency");
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Distribution failed",
    };
  }
}
