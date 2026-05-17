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
  const key = decodeURIComponent(id);
  const student = await prisma.student.findFirst({
    where: { OR: [{ studentNumber: key }, { id: key }] },
    include: {
      deliveries: { where: { type: "LAPTOP" }, include: { operator: true } },
    },
  });
  if (!student || student.deliveries.length === 0) notFound();

  const d = student.deliveries[0];
  const sigDataUrl = d.signaturePng
    ? `data:image/png;base64,${Buffer.from(d.signaturePng).toString("base64")}`
    : null;

  return (
    <ReceiptScreen
      student={toClientStudent(student)}
      signature={{
        tutorName: d.tutorNameTyped || "",
        tutorId: d.tutorIdLast4 || "",
        signaturePng: sigDataUrl,
      }}
      operatorName={d.operator?.fullName || "Opérateur"}
    />
  );
}
