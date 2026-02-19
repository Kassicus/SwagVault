import { type NextRequest } from "next/server";
import { validateApiKey } from "./keys";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export type ApiAuthContext = Awaited<ReturnType<typeof validateApiKey>>;

export async function authenticateApiRequest(req: NextRequest): Promise<ApiAuthContext> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const rawKey = authHeader.slice(7);
  return validateApiKey(rawKey);
}

export function requirePermission(
  permissions: string[],
  required: string
): void {
  // Wildcard permission
  if (permissions.includes("*")) return;

  // Exact match
  if (permissions.includes(required)) return;

  // Category wildcard (e.g. "items:*" covers "items:read")
  const [category] = required.split(":");
  if (permissions.includes(`${category}:*`)) return;

  throw new ForbiddenError(`Missing required permission: ${required}`);
}
