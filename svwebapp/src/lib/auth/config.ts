import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { verifyPassword } from "./password";
import { findOrCreateSsoUser, linkUserToOrg, findOrgBySsoTenant } from "./sso";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
        };
      },
    }),
    ...(process.env.MICROSOFT_CLIENT_ID
      ? [
          MicrosoftEntraID({
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "microsoft-entra-id" && user.email) {
        const ssoUser = await findOrCreateSsoUser({
          email: user.email,
          name: user.name ?? user.email.split("@")[0],
          image: user.image,
        });

        // If Microsoft provides a tenant ID, try linking to an org
        const tenantId = (profile as Record<string, unknown>)?.tid as string | undefined;
        if (tenantId) {
          const org = await findOrgBySsoTenant(tenantId);
          if (org) {
            await linkUserToOrg(ssoUser.id, org.id);
          }
        }

        user.id = ssoUser.id;
        return true;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      if (account?.provider === "microsoft-entra-id") {
        token.provider = "microsoft";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
