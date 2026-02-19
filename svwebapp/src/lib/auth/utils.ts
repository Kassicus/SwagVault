import { auth } from "./config";
import { UnauthorizedError, ForbiddenError } from "../errors";

export { hashPassword, verifyPassword } from "./password";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email!,
    displayName: session.user.name ?? "",
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export type MemberRole = "owner" | "admin" | "manager" | "member";

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  member: 1,
};

export function hasMinRole(
  userRole: MemberRole,
  requiredRole: MemberRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function requireRole(
  userRole: MemberRole,
  requiredRole: MemberRole
): void {
  if (!hasMinRole(userRole, requiredRole)) {
    throw new ForbiddenError("Insufficient permissions");
  }
}
