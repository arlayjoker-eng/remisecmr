import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { levelFromGrado } from "@/lib/level";

// Synchronisation PUSH depuis cmr-device-manager (qui tourne sur le portable de
// l'admin, hors d'atteinte du VPS). Machine à machine : pas de session NextAuth,
// l'authentification se fait par clé partagée (X-Sync-Key ↔ SYNC_SECRET).
//
// Le middleware exclut déjà /api du gardien de session : ce handler est donc
// seul responsable de son contrôle d'accès.
//
// Garanties :
//  - aucun mot de passe d'élève n'est lu, même s'il en arrivait un ;
//  - la réponse ne contient QUE des compteurs, jamais de données d'élève ;
//  - le flux casier n'est pas touché (voir la liste des champs écrits) ;
//  - échec fermé : sans SYNC_SECRET configuré, l'endpoint est désactivé.
export const runtime = "nodejs";

const MAX_ALUMNOS = 5000;

type AlumnoIn = {
  numero_fiche?: unknown;
  nombre?: unknown;
  apellido?: unknown;
  grupo?: unknown;
  grado?: unknown;
  numero_caja?: unknown;
  serie_laptop?: unknown;
  serie_cargador?: unknown;
  serie_stylus?: unknown;
};

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}
function orNull(v: unknown): string | null {
  const s = str(v);
  return s === "" ? null : s;
}

/**
 * Comparaison à temps constant. On hache les deux côtés d'abord : les condensés
 * ont toujours la même longueur, ce qui évite de divulguer celle de la clé.
 */
function keyIsValid(received: string | null, secret: string): boolean {
  if (!received) return false;
  const a = crypto.createHash("sha256").update(received).digest();
  const b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = process.env.SYNC_SECRET ?? "";
  // Échec fermé : pas de clé configurée ⇒ endpoint indisponible, jamais ouvert.
  if (!secret) {
    return NextResponse.json({ error: "sync_disabled" }, { status: 503 });
  }
  if (!keyIsValid(req.headers.get("x-sync-key"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    alumnos?: unknown;
  } | null;
  const alumnos = body?.alumnos;
  if (!Array.isArray(alumnos)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (alumnos.length > MAX_ALUMNOS) {
    return NextResponse.json(
      { error: "too_many", max: MAX_ALUMNOS },
      { status: 413 },
    );
  }

  let creados = 0;
  let actualizados = 0;
  const errores: { numero_fiche: string; error: string }[] = [];

  // Séquentiel avec try/catch par élève : une ligne fautive n'annule pas les
  // autres. L'opération est idempotente, donc rejouer la synchro répare tout
  // ce qui aurait échoué.
  for (const raw of alumnos as AlumnoIn[]) {
    const studentNumber = str(raw?.numero_fiche);
    const firstName = str(raw?.nombre);
    const lastName = str(raw?.apellido);
    const group = str(raw?.grupo);

    if (!studentNumber) {
      errores.push({ numero_fiche: "(vide)", error: "numero_fiche manquant" });
      continue;
    }
    if (!firstName || !lastName || !group) {
      errores.push({
        numero_fiche: studentNumber,
        error: "nombre, apellido ou grupo manquant",
      });
      continue;
    }

    // Champs écrits. Tout ce qui n'est PAS listé ici reste intact :
    //   receivesLocker, assignedLockerNumber, assignedCombinationCode,
    //   petitCasier, lockerDeliveredAt  → le flux casier vit du CSV ;
    //   laptopStatus                    → une remise DELIVERED ne repasse pas
    //                                     en PENDING à la prochaine synchro ;
    //   email                           → non transmis par cmr-device-manager.
    const datos = {
      firstName,
      lastName,
      group,
      level: levelFromGrado(str(raw?.grado), group),
      boxNumber: orNull(raw?.numero_caja),
      laptopSerial: orNull(raw?.serie_laptop),
      chargerSerial: orNull(raw?.serie_cargador),
      stylusSerial: orNull(raw?.serie_stylus),
      // Règle métier : présent dans cmr-device-manager ⇒ reçoit un portable.
      receivesLaptop: true,
    };

    try {
      const existing = await prisma.student.findUnique({
        where: { studentNumber },
        select: { id: true },
      });
      if (existing) {
        await prisma.student.update({ where: { studentNumber }, data: datos });
        actualizados++;
      } else {
        await prisma.student.create({ data: { studentNumber, ...datos } });
        creados++;
      }
    } catch (e) {
      errores.push({
        numero_fiche: studentNumber,
        error: e instanceof Error ? e.message : "erreur inconnue",
      });
    }
  }

  console.log(
    `[sync] ${alumnos.length} reçus | créés=${creados} maj=${actualizados} erreurs=${errores.length}`,
  );

  // Uniquement des compteurs : aucune donnée d'élève ne repart d'ici.
  return NextResponse.json({
    ok: true,
    total: alumnos.length,
    creados,
    actualizados,
    errores,
  });
}
