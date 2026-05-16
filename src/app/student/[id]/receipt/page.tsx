import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientStudent } from "@/lib/mappers";
import { notFound } from "next/navigation";
import ReceiptScreen from "@/components/screens/ReceiptScreen";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const student = await prisma.student.findUnique({
    where: { id: decodeURIComponent(id) },
    include: { delivery: { include: { operator: true } } },
  });
  if (!student || !student.delivery) notFound();

  const d = student.delivery;
  const sigDataUrl = d.signaturePng
    ? `data:image/png;base64,${Buffer.from(d.signaturePng).toString("base64")}`
    : null;

  return (
    <ReceiptScreen
      student={toClientStudent(student)}
      signature={{
        tutorName: d.tutorNameTyped,
        tutorId: d.tutorIdLast4,
        signaturePng: sigDataUrl,
      }}
      operatorName={
        d.operator?.fullName || session?.user?.name || "Opérateur"
      }
    />
  );
}
