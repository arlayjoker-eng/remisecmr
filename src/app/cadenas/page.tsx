import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CadenasScreen from "@/components/screens/CadenasScreen";

export const dynamic = "force-dynamic";

export default async function CadenasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <CadenasScreen />;
}
