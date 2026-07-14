import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { toSchoolEmail } from "@/lib/util";

// --- Limitation du nombre d'essais (anti-force brute) ---------------------
// Compteur en mémoire par courriel. Suffisant pour un unique processus pm2 sur
// le VPS ; pour plusieurs instances il faudrait un magasin partagé (Redis/DB).
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const attempts = new Map<string, { count: number; first: number }>();

function throttleKey(email: string): string {
  return email.toLowerCase();
}
function isLockedOut(email: string): boolean {
  const rec = attempts.get(throttleKey(email));
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(throttleKey(email));
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}
function recordFailure(email: string): void {
  const k = throttleKey(email);
  const rec = attempts.get(k);
  if (!rec || Date.now() - rec.first > WINDOW_MS) {
    attempts.set(k, { count: 1, first: Date.now() });
  } else {
    rec.count += 1;
  }
}
function clearFailures(email: string): void {
  attempts.delete(throttleKey(email));
}

// Ré-évaluer le drapeau `active` du compte au plus toutes les 5 min via le JWT,
// pour qu'un compte désactivé cesse de fonctionner rapidement sans lire la BD
// à chaque requête.
const ACTIVE_RECHECK_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    // Poste iPad partagé : une session ne survit pas au-delà d'un quart de
    // travail. Réduit la fenêtre d'un jeton volé ou d'un compte désactivé.
    maxAge: 8 * 60 * 60, // 8 h
  },
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
          // Accepte le nom d'utilisateur court OU le courriel complet.
          const email = toSchoolEmail(String(creds?.email ?? ""));
          const password = String(creds?.password ?? "");
          if (!email || !password) return null;
          if (isLockedOut(email)) return null;

          // prisma loaded dynamically so it stays out of the edge/middleware bundle
          const { prisma } = await import("@/lib/db");
          const bcryptMod: any = await import("bcryptjs");
          const bcrypt = bcryptMod.default ?? bcryptMod;

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.active) {
            recordFailure(email);
            return null;
          }

          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) {
            recordFailure(email);
            return null;
          }

          clearFailures(email);
          return {
            id: user.id,
            name: user.fullName,
            email: user.email,
            role: user.role,
            canLaptopMode: user.canLaptopMode,
            canCasierMode: user.canCasierMode,
          };
        } catch (e) {
          console.error("[authorize] error:", e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        const u = user as {
          role?: string;
          canLaptopMode?: boolean;
          canCasierMode?: boolean;
        };
        token.role = u.role;
        token.userId = user.id;
        token.canLaptopMode = u.canLaptopMode ?? true;
        token.canCasierMode = u.canCasierMode ?? true;
        token.activeCheckedAt = Date.now();
      } else if (
        token.userId &&
        (typeof token.activeCheckedAt !== "number" ||
          Date.now() - (token.activeCheckedAt as number) > ACTIVE_RECHECK_MS)
      ) {
        // Révalidation périodique : compte désactivé → jeton invalidé.
        try {
          const { prisma } = await import("@/lib/db");
          const u = await prisma.user.findUnique({
            where: { id: token.userId as string },
            select: {
              active: true,
              role: true,
              canLaptopMode: true,
              canCasierMode: true,
            },
          });
          if (!u || !u.active) return null;
          token.role = u.role;
          token.canLaptopMode = u.canLaptopMode;
          token.canCasierMode = u.canCasierMode;
          token.activeCheckedAt = Date.now();
        } catch {
          /* en cas d'erreur BD, on garde le jeton jusqu'au prochain contrôle */
        }
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.userId as string;
        session.user.canLaptopMode = token.canLaptopMode ?? true;
        session.user.canCasierMode = token.canCasierMode ?? true;
      }
      return session;
    },
  },
});
