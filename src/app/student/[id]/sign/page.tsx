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
  const session = await auth();
  const student = await prisma.student.findUnique({
    where: { id: decodeURIComponent(id) },
    include: { delivery: true },
  });
  if (!student) notFound();
  if (student.delivery) redirect(`/student/${student.id}/receipt`);

  return (
    <SignatureScreen
      student={toClientStudent(student)}
      operatorName={session?.user?.name || "Opérateur"}
    />
  );
}
