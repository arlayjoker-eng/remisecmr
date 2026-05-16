import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

function slug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Kiosque",
      credentials: {
        name: { label: "Nom", type: "text" },
        mode: { label: "Mode", type: "text" },
      },
      // Passwordless kiosk login: the iPad is physically secured, the operator
      // types their name and picks a mode. We find-or-create the Operator row.
      authorize: async (creds) => {
        const name = String(creds?.name ?? "").trim();
        const modeRaw = String(creds?.mode ?? "laptop");
        if (name.length < 4) return null;
        const role = modeRaw === "casier" ? "casier" : "laptop";

        const { prisma } = await import("@/lib/db");
        const email = `${slug(name)}@kiosk.local`;

        let operator = await prisma.operator.findUnique({ where: { email } });
        if (!operator) {
          operator = await prisma.operator.create({
            data: { email, fullName: name, role, passwordHash: "" },
          });
        } else if (operator.role !== role || operator.fullName !== name) {
          operator = await prisma.operator.update({
            where: { id: operator.id },
            data: { role, fullName: name },
          });
        }

        return {
          id: operator.id,
          name: operator.fullName,
          email: operator.email,
          role: operator.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.operatorId = user.id;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { operatorId?: string }).operatorId =
          token.operatorId as string;
      }
      return session;
    },
  },
});
