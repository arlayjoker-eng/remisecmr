import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { toClientStudent } from "@/lib/mappers";
import { initialsOf } from "@/lib/util";
import ScannerScreen from "@/components/screens/ScannerScreen";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const mode = session.user.role === "casier" ? "casier" : "laptop";
  const operator = {
    name: session.user.name || "Opérateur",
    role:
      mode === "casier"
        ? "Responsable casiers"
        : "Coordination Informatique",
    initials: initialsOf(session.user.name) || "OP",
  };

  if (mode === "laptop") {
    const students = await prisma.student.findMany({
      include: { delivery: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    const all = students.map((s) => toClientStudent(s));
    return (
      <ScannerScreen
        queue={all.filter((s) => s.status !== "delivered")}
        delivered={all.filter((s) => s.status === "delivered")}
        operator={operator}
        mode="laptop"
      />
    );
  }

  // casier mode — students who own a locker OR are a binôme
  const lockers = await prisma.locker.findMany({
    include: { owner: true, binome: true },
    orderBy: { number: "asc" },
  });
  const queue: ReturnType<typeof toClientStudent>[] = [];
  const delivered: ReturnType<typeof toClientStudent>[] = [];
  for (const l of lockers) {
    const bucket = l.status === "delivered" ? delivered : queue;
    bucket.push(toClientStudent(l.owner));
    if (l.binome) bucket.push(toClientStudent(l.binome));
  }
  return (
    <ScannerScreen
      queue={queue}
      delivered={delivered}
      operator={operator}
      mode="casier"
    />
  );
}
