import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientStudent } from "@/lib/mappers";
import { notFound, redirect } from "next/navigation";
import SignatureScreen from "@/components/screens/SignatureScreen";

export const dynamic = "force-dynamic";

export default async function SignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const key = decodeURIComponent(id);
  const session = await auth();
  const student = await prisma.student.findFirst({
    where: { OR: [{ studentNumber: key }, { id: key }] },
    include: { deliveries: { where: { type: "LAPTOP" } } },
  });
  if (!student) notFound();
  if (student.deliveries.length > 0) {
    redirect(`/student/${student.studentNumber}/receipt`);
  }
  return (
    <SignatureScreen
      student={toClientStudent(student)}
      operatorName={session?.user?.name || "Opérateur"}
    />
  );
}
