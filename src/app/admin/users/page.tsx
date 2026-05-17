import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import UsersScreen from "@/components/screens/UsersScreen";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  return (
    <UsersScreen
      users={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
      currentUserId={session?.user?.id || ""}
    />
  );
}
