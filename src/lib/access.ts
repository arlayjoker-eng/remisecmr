// Isolation par mode (CN-002). Les responsables et admins ne sont pas limités ;
// un OPERATOR est cantonné aux modes que l'admin lui a accordés.
import type { Session } from "next-auth";
import { prisma } from "@/lib/db";

type U = Session["user"] | undefined;

export function isManager(user: U): boolean {
  return user?.role === "SUPER_ADMIN" || user?.role === "STAFF_MANAGER";
}

export function canLaptop(user: U): boolean {
  if (!user) return false;
  return isManager(user) || user.canLaptopMode !== false;
}

export function canCasier(user: U): boolean {
  if (!user) return false;
  return isManager(user) || user.canCasierMode !== false;
}

// Poste réception : SUPER_ADMIN, ou utilisateur avec le drapeau accessReception.
// (mirroir exact de la garde de /api/reception/announce et /reception)
export async function hasReceptionAccess(user: U): Promise<boolean> {
  if (!user?.id) return false;
  if (user.role === "SUPER_ADMIN") return true;
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { accessReception: true, role: true },
  });
  return !!me && (me.role === "SUPER_ADMIN" || me.accessReception);
}

/**
 * Durée d'une prise en charge par un poste portable. Passé ce délai, la prise
 * en charge est considérée abandonnée et l'élève redevient disponible.
 * Partagée par /api/reception/claim (qui la pose) et /api/reception/announce
 * (qui refuse d'annuler pendant qu'elle est active) : deux valeurs séparées
 * finiraient par diverger et les deux gardes se contrediraient.
 */
export const CLAIM_TTL_MS = 5 * 60 * 1000;
