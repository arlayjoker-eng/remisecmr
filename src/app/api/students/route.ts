import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientStudent } from "@/lib/mappers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const status = new URL(req.url).searchParams.get("status");
  const where =
    status === "pending" || status === "delivered"
      ? { laptopStatus: status }
      : {};
  const students = await prisma.student.findMany({
    where,
    include: { delivery: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return NextResponse.json(students.map((s) => toClientStudent(s)));
}
