"use client";
// Navigation par rôle — boutons RAPPORTS / ADMIN dans les en-têtes.
import React from "react";
import { useRouter } from "next/navigation";
import { K } from "@/lib/k";

function chipStyle(active: boolean): React.CSSProperties {
  return {
    border: "none",
    background: active ? K.violetDeep : "#1E3A5F",
    color: "#fff",
    borderRadius: 999,
    padding: "12px 18px",
    minHeight: 44, // taille tactile iPad
    fontFamily: K.display,
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    cursor: active ? "default" : "pointer",
    boxShadow: "0 3px 0 rgba(15,25,75,0.25)",
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
