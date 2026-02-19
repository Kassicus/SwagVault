import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "getswagvault.com";

function extractSubdomain(hostname: string): string | null {
  // Local dev: use ?tenant= query param
  // Production: extract subdomain from hostname

  // Remove port if present
  const host = hostname.split(":")[0];

  // Check if it's a subdomain of the app domain
  if (host.endsWith(`.${APP_DOMAIN}`)) {
    const sub = host.replace(`.${APP_DOMAIN}`, "");
    // Ignore www
    if (sub && sub !== "www") return sub;
  }

  return null;
}

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth",
  "/_next",
  "/favicon.ico",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export default function proxy(request: NextRequest) {
  const { hostname, pathname, searchParams } = request.nextUrl;

  // Dev helper: allow ?tenant=slug to simulate subdomains
  const devTenant = searchParams.get("tenant");
  const subdomain = devTenant ?? extractSubdomain(hostname);

  if (!subdomain) {
    // No subdomain = marketing site or signup routes
    return;
  }

  // Set the org slug header for downstream resolution
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-org-slug", subdomain);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
