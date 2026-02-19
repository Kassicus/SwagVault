import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, organizations } from "@/lib/db/schema";
import { requirePlanFeature } from "@/lib/stripe/enforce";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

const KEY_PREFIX = "sv_live_";

export function generateApiKey(): { rawKey: string; hash: string; prefix: string } {
  const randomPart = crypto.randomBytes(32).toString("hex");
  const rawKey = `${KEY_PREFIX}${randomPart}`;
  const hash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const prefix = rawKey.slice(0, 12);
  return { rawKey, hash, prefix };
}

export async function validateApiKey(rawKey: string) {
  if (!rawKey.startsWith(KEY_PREFIX)) {
    throw new UnauthorizedError("Invalid API key format");
  }

  const hash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const [keyRow] = await db
    .select({
      id: apiKeys.id,
      tenantId: apiKeys.tenantId,
      permissions: apiKeys.permissions,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      orgPlan: organizations.plan,
    })
    .from(apiKeys)
    .innerJoin(organizations, eq(apiKeys.tenantId, organizations.id))
    .where(eq(apiKeys.keyHash, hash));

  if (!keyRow) {
    throw new UnauthorizedError("Invalid API key");
  }

  // Check enterprise plan
  const hasAccess = await requirePlanFeature(keyRow.tenantId, "apiAccess");
  if (!hasAccess) {
    throw new ForbiddenError("API access requires an Enterprise plan");
  }

  // Update lastUsedAt fire-and-forget
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRow.id))
    .catch(() => {});

  return {
    apiKeyId: keyRow.id,
    tenantId: keyRow.tenantId,
    permissions: keyRow.permissions ?? [],
    org: {
      name: keyRow.orgName,
      slug: keyRow.orgSlug,
      plan: keyRow.orgPlan,
    },
  };
}
