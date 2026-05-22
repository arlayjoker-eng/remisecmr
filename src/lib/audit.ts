import { prisma } from "@/lib/db";

// Journalise une action. N'échoue jamais l'action principale si le
// journal pose problème (best-effort).
export async function logAudit(opts: {
  userId: string;
  userName: string;
  action: string;
  target: string;
  details: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({ data: opts });
  } catch {
    /* le journal ne doit jamais bloquer l'opération */
  }
}
