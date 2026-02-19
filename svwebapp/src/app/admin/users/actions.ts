"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import {
  users,
  organizationMembers,
  balances,
} from "@/lib/db/schema";
import { requireAuth, hashPassword } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { sendEmail } from "@/lib/email/client";
import { inviteEmailHtml } from "@/lib/email/templates/invite";
import { checkPlanLimit } from "@/lib/stripe/enforce";

export async function inviteUser(formData: FormData) {
  const currentUser = await requireAuth();
  const org = await getResolvedTenant();

  const email = (formData.get("email") as string)?.trim();
  const role = (formData.get("role") as string) ?? "member";

  if (!email) return { success: false, error: "Email is required" };

  // Check plan member limit
  const memberCheck = await checkPlanLimit(org.id, "members");
  if (!memberCheck.allowed) {
    return {
      success: false,
      error: `Member limit reached (${memberCheck.current}/${memberCheck.limit}). Upgrade your plan to add more members.`,
    };
  }

  try {
    // Check if user already exists
    let existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });

    if (!existingUser) {
      // Create a placeholder user account
      const tempPassword = await hashPassword(crypto.randomUUID());
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          passwordHash: tempPassword,
          displayName: email.split("@")[0],
        })
        .returning({ id: users.id });
      existingUser = newUser;
    }

    // Check if already a member
    const existingMember = await withTenant(org.id, async (tx) => {
      const [member] = await tx
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.tenantId, org.id),
            eq(organizationMembers.userId, existingUser.id)
          )
        );
      return member;
    });

    if (existingMember) {
      return { success: false, error: "User is already a member" };
    }

    // Create membership and balance
    await withTenant(org.id, async (tx) => {
      await tx.insert(organizationMembers).values({
        tenantId: org.id,
        userId: existingUser.id,
        role: role as "owner" | "admin" | "manager" | "member",
      });
      await tx.insert(balances).values({
        tenantId: org.id,
        userId: existingUser.id,
        balance: 0,
      });
    });

    // Send invite email
    const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "getswagvault.com";
    const inviteUrl = `https://${org.slug}.${domain}/register?token=invite`;

    try {
      await sendEmail({
        to: email,
        subject: `You've been invited to ${org.name} on SwagVault`,
        html: inviteEmailHtml({
          orgName: org.name,
          inviterName: currentUser.displayName,
          inviteUrl,
        }),
      });
    } catch {
      // Email failure shouldn't block invite
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to invite user",
    };
  }
}

export async function updateMemberRole(
  memberId: string,
  role: "admin" | "manager" | "member"
) {
  await requireAuth();
  const org = await getResolvedTenant();

  await withTenant(org.id, async (tx) => {
    await tx
      .update(organizationMembers)
      .set({ role })
      .where(
        and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.tenantId, org.id)
        )
      );
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleMemberActive(
  memberId: string,
  isActive: boolean
) {
  await requireAuth();
  const org = await getResolvedTenant();

  await withTenant(org.id, async (tx) => {
    await tx
      .update(organizationMembers)
      .set({ isActive })
      .where(
        and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.tenantId, org.id)
        )
      );
  });

  revalidatePath("/admin/users");
  return { success: true };
}
