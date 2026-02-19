"use server";

import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";

/**
 * Manually create and set a session cookie.
 * Bypasses Auth.js signIn() which throws redirect errors in server actions.
 */
export async function createSession(user: {
  id: string;
  email: string;
  displayName: string;
}) {
  const isSecure = process.env.NODE_ENV === "production";
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      name: user.displayName,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      jti: crypto.randomUUID(),
    },
    secret: process.env.NEXTAUTH_SECRET!,
    salt: cookieName,
  });

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}
