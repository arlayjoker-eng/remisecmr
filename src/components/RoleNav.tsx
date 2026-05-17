"use client";
// Navigation par rôle — boutons RAPPORTS / ADMIN dans les en-têtes.
import React from "react";
import { useRouter } from "next/navigation";
import { K } from "@/lib/k";

function chipStyle(active: boolean): React.CSSProperties {
  return {
    border: "none",
    background: active ? "#fff" : "rgba(255,255,255,0.10)",
    color: active ? K.violetDeep : "#fff",
    borderRadius: 999,
    padding: "8px 14px",
    fontFamily: K.display,
    fontWeight: 800,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    cursor: active ? "default" : "pointer",
  };
}

export default function RoleNav({
  role,
  current,
}: {
  role?: string;
  current?: "scan" | "reports" | "admin";
}) {
  const router = useRouter();
  const items: { key: string; label: string; href: string }[] = [];
  if (role === "STAFF_MANAGER" || role === "SUPER_ADMIN") {
    items.push({ key: "reports", label: "Rapports", href: "/reports" });
  }
  if (role === "SUPER_ADMIN") {
    items.push({ key: "admin", label: "Admin", href: "/admin" });
  }
  if (items.length === 0) return null;

  return (
    <>
      {items.map((it) => {
        const active = it.key === current;
        return (
          <button
            key={it.key}
            onClick={() => !active && router.push(it.href)}
            style={chipStyle(active)}
          >
            {it.label}
          </button>
        );
      })}
    </>
  );
}
