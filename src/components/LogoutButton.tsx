"use client";
import { signOut } from "next-auth/react";
import { Btn, Icons } from "@/components/ui";

export default function LogoutButton({
  kind = "ghostDark",
}: {
  kind?: "ghost" | "ghostDark" | "light";
}) {
  return (
    <Btn
      kind={kind}
      size="md"
      icon={Icons.back({ size: 18, stroke: kind === "ghostDark" ? "#fff" : undefined })}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Déconnexion
    </Btn>
  );
}
