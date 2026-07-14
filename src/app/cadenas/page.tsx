import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { canCasier } from "@/lib/access";
import CadenasScreen from "@/components/screens/CadenasScreen";

export const dynamic = "force-dynamic";

export default async function CadenasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Isolation par mode (CN-002) : la recherche de cadenas révèle des
  // combinaisons → réservée aux opérateurs casier et aux responsables.
  if (!canCasier(session.user)) redirect("/scan");
  return <CadenasScreen />;
}
