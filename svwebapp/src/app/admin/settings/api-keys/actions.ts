"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db/tenant";
import { apiKeys } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requirePlanFeature } from "@/lib/stripe/enforce";
import { generateApiKey } from "@/lib/api/keys";
import { createApiKeySchema } from "@/lib/validators/api";
import { logAuditEvent } from "@/lib/audit/log";

export async function createApiKey(formData: FormData) {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  const hasAccess = await requirePlanFeature(org.id, "apiAccess");
  if (!hasAccess) {
    return { success: false, error: "API access requires an Enterprise plan" };
  }

  const name = formData.get("name") as string;
  const permissionsRaw = formData.get("permissions") as string;
  const permissions = permissionsRaw ? JSON.parse(permissionsRaw) as string[] : [];

  const parsed = createApiKeySchema.safeParse({ name, permissions });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { rawKey, hash, prefix } = generateApiKey();

  await withTenant(org.id, async (tx) => {
    await tx.insert(apiKeys).values({
      tenantId: org.id,
      name: parsed.data.name,
      keyHash: hash,
      keyPrefix: prefix,
      permissions: parsed.data.permissions,
      createdBy: user.id,
    });
  });

  logAuditEvent({ tenantId: org.id, userId: user.id, action: "api_key.created", resourceType: "api_key", metadata: { name: parsed.data.name, prefix } });

  revalidatePath("/admin/settings/api-keys");
  return { success: true, rawKey };
}

export async function deleteApiKey(keyId: string) {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  await withTenant(org.id, async (tx) => {
    await tx
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, org.id)));
  });

  logAuditEvent({ tenantId: org.id, userId: user.id, action: "api_key.deleted", resourceType: "api_key", resourceId: keyId });

  revalidatePath("/admin/settings/api-keys");
  return { success: true };
}
