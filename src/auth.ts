import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "RemiseCMR",
      credentials: {
        email: { label: "Courriel", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (creds) => {
        try {
          const email = String(creds?.email ?? "").trim().toLowerCase();
          const password = String(creds?.password ?? "");
          if (!email || !password) return null;

          // prisma loaded dynamically so it stays out of the edge/middleware bundle
          const { prisma } = await import("@/lib/db");
          const bcryptMod: any = await import("bcryptjs");
          const bcrypt = bcryptMod.default ?? bcryptMod;

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.active) return null;

          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) return null;

          return {
            id: user.id,
            name: user.fullName,
            email: user.email,
            role: user.role,
          };
        } catch (e) {
          console.error("[authorize] error:", e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.userId = user.id;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },
});
