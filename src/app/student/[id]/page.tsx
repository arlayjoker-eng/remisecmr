import { prisma } from "@/lib/db";
import { toClientStudent } from "@/lib/mappers";
import { notFound } from "next/navigation";
import StudentScreen from "@/components/screens/StudentScreen";

export const dynamic = "force-dynamic";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id: decodeURIComponent(id) },
    include: { delivery: true },
  });
  if (!student) notFound();
  return <StudentScreen student={toClientStudent(student)} />;
}
