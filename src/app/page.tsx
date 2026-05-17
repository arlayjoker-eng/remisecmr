import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const role = session?.user?.role;
  if (role === "SUPER_ADMIN") redirect("/admin");
  if (role === "STAFF_MANAGER") redirect("/reports");
  redirect("/scan");
}
