"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/utils";

export async function updateProfile(formData: FormData) {
  const user = await requireAuth();

  const displayName = (formData.get("displayName") as string)?.trim();
  if (!displayName || displayName.length < 2) {
    return { success: false, error: "Display name must be at least 2 characters" };
  }

  await db
    .update(users)
    .set({ displayName, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  revalidatePath("/profile");
  return { success: true };
}
