import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

const ROLES = ["SUPER_ADMIN", "STAFF_MANAGER", "OPERATOR"];

async function guard() {
  const session = await auth();
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return { session };
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await guard();
  if (g.error) return g.error;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.fullName === "string" && body.fullName.trim()) {
    data.fullName = body.fullName.trim();
  }
  if (typeof body.role === "string") {
    if (!ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }
    data.role = body.role;
  }
  if (typeof body.active === "boolean") {
    data.active = body.active;
  }
  if (typeof body.accessLaptopReports === "boolean") {
    data.accessLaptopReports = body.accessLaptopReports;
  }
  if (typeof body.accessCasierReports === "boolean") {
    data.accessCasierReports = body.accessCasierReports;
  }
  if (typeof body.accessReception === "boolean") {
    data.accessReception = body.accessReception;
  }
  if (typeof body.canLaptopMode === "boolean") {
    data.canLaptopMode = body.canLaptopMode;
  }
  if (typeof body.canCasierMode === "boolean") {
    data.canCasierMode = body.canCasierMode;
  }
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit faire au moins 8 caractères." },
        { status: 400 },
      );
    }
    const bcryptMod: any = await import("bcryptjs");
    const bcrypt = bcryptMod.default ?? bcryptMod;
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  // empêcher de se retirer soi-même le rôle SUPER_ADMIN ou de se désactiver
  if (id === g.session!.user.id) {
    if (data.role && data.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Vous ne pouvez pas changer votre propre rôle." },
        { status: 400 },
      );
    }
    if (data.active === false) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas désactiver votre propre compte." },
        { status: 400 },
      );
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Aucun changement." }, { status: 400 });
  }

  try {
    await prisma.user.update({ where: { id }, data });
  } catch {
    return NextResponse.json(
      { error: "Utilisateur introuvable." },
      { status: 404 },
    );
  }
  // Journal : lister les champs modifiés, jamais le hash du mot de passe.
  const changed = Object.keys(data).map((k) =>
    k === "passwordHash" ? "mot de passe" : k,
  );
  await logAudit({
    userId: String(g.session!.user.id ?? ""),
    userName: g.session!.user.name || "?",
    action: "user.update",
    target: id,
    details: `champs modifiés : ${changed.join(", ")}`,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await guard();
  if (g.error) return g.error;
  const { id } = await ctx.params;

  if (id === g.session!.user.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte." },
      { status: 400 },
    );
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      {
        error:
          "Impossible de supprimer : cet utilisateur a des remises enregistrées. Désactivez-le plutôt.",
      },
      { status: 409 },
    );
  }
  await logAudit({
    userId: String(g.session!.user.id ?? ""),
    userName: g.session!.user.name || "?",
    action: "user.delete",
    target: id,
    details: "compte supprimé",
  });
  return NextResponse.json({ ok: true });
}
