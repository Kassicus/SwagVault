"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";

export async function updateOrgSettings(formData: FormData) {
  await requireAuth();
  const org = await getResolvedTenant();

  const name = formData.get("name") as string;
  const primaryColor = formData.get("primaryColor") as string;
  const currencyName = formData.get("currencyName") as string;
  const currencySymbol = formData.get("currencySymbol") as string;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name) updates.name = name;
  if (primaryColor) updates.primaryColor = primaryColor;
  if (currencyName) updates.currencyName = currencyName;
  if (currencySymbol) updates.currencySymbol = currencySymbol;

  await db
    .update(organizations)
    .set(updates)
    .where(eq(organizations.id, org.id));

  revalidatePath("/admin/settings");
  return { success: true };
}
