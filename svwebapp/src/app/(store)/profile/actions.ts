"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/utils";
import { uploadUserAvatar, deleteFile } from "@/lib/storage/supabase";

export async function updateProfile(formData: FormData) {
  const user = await requireAuth();

  const displayName = (formData.get("displayName") as string)?.trim();
  if (!displayName || displayName.length < 2) {
    return { success: false, error: "Display name must be at least 2 characters" };
  }

  const avatarFile = formData.get("avatar") as File | null;
  const updateData: { displayName: string; updatedAt: Date; avatarUrl?: string } = {
    displayName,
    updatedAt: new Date(),
  };

  if (avatarFile && avatarFile.size > 0) {
    // Upload new avatar
    const path = await uploadUserAvatar(user.id, avatarFile);

    // Best-effort delete old avatar
    const [existing] = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, user.id));
    if (existing?.avatarUrl && existing.avatarUrl !== path) {
      try { await deleteFile(existing.avatarUrl); } catch {}
    }

    updateData.avatarUrl = path;
  }

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, user.id));

  revalidatePath("/profile");
  return { success: true };
}

export async function removeAvatar() {
  const user = await requireAuth();

  const [existing] = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, user.id));

  if (existing?.avatarUrl) {
    try { await deleteFile(existing.avatarUrl); } catch {}
  }

  await db
    .update(users)
    .set({ avatarUrl: null, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  revalidatePath("/profile");
  return { success: true };
}
