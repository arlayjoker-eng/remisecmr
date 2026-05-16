import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientLocker } from "@/lib/mappers";
import { NextResponse } from "next/server";

// PATCH — change padlock code, add/remove a binôme, or mark delivered.
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "casier") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    binomeId?: string | null;
    status?: string;
  };

  const data: Record<string, unknown> = {};
  if (typeof body.code === "string" && body.code.trim()) {
    data.code = body.code.trim();
  }
  if ("binomeId" in body) {
    data.binomeId = body.binomeId ? String(body.binomeId) : null;
  }
  if (body.status === "delivered" || body.status === "pending") {
    data.status = body.status;
    if (body.status === "delivered") {
      data.deliveredAt = new Date();
      data.deliveredBy = session.user.operatorId ?? null;
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  try {
    const locker = await prisma.locker.update({ where: { id }, data });
    return NextResponse.json({
      id: locker.id,
      ownerId: locker.ownerId,
      ...toClientLocker(locker),
    });
  } catch {
    // most likely the binôme student is already paired to another locker
    return NextResponse.json(
      { error: "conflict", message: "Cet élève est déjà associé à un casier." },
      { status: 409 },
    );
  }
}
