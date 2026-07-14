import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toClientStudent } from "@/lib/mappers";
import { decryptBytes, decryptString } from "@/lib/crypto";
import { notFound, redirect } from "next/navigation";
import ReceiptScreen from "@/components/screens/ReceiptScreen";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Le middleware protège /student/*, mais on revalide ici et on ajoute une
  // autorisation par ressource : la signature (donnée d'un mineur) n'est
  // visible que par l'opérateur qui a fait la remise ou un responsable.
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  const userId = session.user.id ?? "";
  const isManager = role === "SUPER_ADMIN" || role === "STAFF_MANAGER";

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
  if (!isManager && d.operatorId !== userId) {
    redirect("/scan");
  }

  // Déchiffrement au repos (CN-004).
  const sigDataUrl = d.signaturePng
    ? `data:image/png;base64,${decryptBytes(Buffer.from(d.signaturePng)).toString("base64")}`
    : null;

  return (
    <ReceiptScreen
      student={toClientStudent(student)}
      signature={{
        tutorName: d.tutorNameTyped || "",
        tutorId: decryptString(d.tutorIdLast4),
        signaturePng: sigDataUrl,
      }}
      operatorName={d.operator?.fullName || "Opérateur"}
    />
  );
}
