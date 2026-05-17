import { auth } from "@/auth";
import { prisma } from "@/lib/db";
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

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const g = await guard();
  if (g.error) return g.error;

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const fullName = String(body?.fullName ?? "").trim();
  const password = String(body?.password ?? "");
  const role = String(body?.role ?? "OPERATOR");
  const active = body?.active !== false;

  if (!email || !fullName) {
    return NextResponse.json(
      { error: "Courriel et nom requis." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit faire au moins 8 caractères." },
      { status: 400 },
    );
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json(
      { error: "Ce courriel est déjà utilisé." },
      { status: 409 },
    );
  }

  const bcryptMod: any = await import("bcryptjs");
  const bcrypt = bcryptMod.default ?? bcryptMod;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, fullName, passwordHash, role: role as never, active },
  });
  return NextResponse.json({ id: user.id });
}
