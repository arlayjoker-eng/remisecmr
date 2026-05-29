import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ReceptionScreen from "@/components/screens/ReceptionScreen";

export const dynamic = "force-dynamic";

export default async function ReceptionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Gate : SUPER_ADMIN OU utilisateur avec accessReception
  const me = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { accessReception: true, role: true },
  });
  if (!me || (me.role !== "SUPER_ADMIN" && !me.accessReception)) {
    redirect("/");
  }

  return (
    <ReceptionScreen operatorName={session.user.name || "Opérateur"} />
  );
}
