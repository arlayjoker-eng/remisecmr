"use client";
// Avertissement « les données de ce casier se contredisent ».
//
// Il informe, il ne barre pas la route : l'opérateur au comptoir doit pouvoir
// remettre le casier quand même. C'est pour cela qu'il n'y a qu'un seul bouton,
// et qu'il dit « Continuer quand même » plutôt que « Annuler ».
import React from "react";
import { K, Btn, Pill, Icons } from "@/components/ui";

export type LockerConflictView = {
  number: string;
  kind: string;
  field: string;
  values: string;
  otherNumber: string | null;
};

const titleOf = (c: LockerConflictView): string =>
  c.kind === "SERIE_PARTAGEE"
    ? `Cadenas enregistré sur deux casiers`
    : `Le fichier donne deux ${c.field} différents`;

/** Bandeau compact, à laisser visible après la fermeture du dialogue. */
export function LockerConflictBanner({
  conflicts,
  onOpen,
}: {
  conflicts: LockerConflictView[];
  onOpen: () => void;
}) {
  if (conflicts.length === 0) return null;
  return (
    <button
      onClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        textAlign: "left",
        background: K.pinkSoft,
        border: `2px solid #F5A9C4`,
        borderRadius: 18,
        padding: "12px 16px",
        cursor: "pointer",
        fontFamily: K.body,
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          background: "#B2245A",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: K.display,
          fontWeight: 800,
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        !
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontFamily: K.display,
            fontSize: 14,
            fontWeight: 800,
            color: "#B2245A",
          }}
        >
          Données du casier {conflicts[0].number} à vérifier
        </span>
        <span style={{ display: "block", fontSize: 12, color: K.ink3, fontWeight: 700 }}>
          {conflicts.length} signalement(s) — toucher pour voir le détail
        </span>
      </span>
      {Icons.chev({ size: 18, stroke: "#B2245A" })}
    </button>
  );
}

export default function LockerConflictDialog({
  conflicts,
  studentName,
  onClose,
}: {
  conflicts: LockerConflictView[];
  studentName?: string;
  onClose: () => void;
}) {
  if (conflicts.length === 0) return null;
  const number = conflicts[0].number;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 95,
        background: "rgba(8,0,31,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "overlayIn 0.3s ease both",
      }}
    >
      <div
        style={{
          width: 560,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          background: "#fff",
          color: K.ink,
          borderRadius: 28,
          padding: 28,
          boxShadow: "0 30px 80px rgba(15,0,60,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "linear-gradient(135deg, #FF7AA8, #B2245A)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: K.display,
              fontWeight: 800,
              fontSize: 26,
              flexShrink: 0,
              boxShadow: "0 4px 0 #8A1A45",
            }}
          >
            !
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 11,
                fontWeight: 800,
                color: "#B2245A",
                letterSpacing: 1.4,
                textTransform: "uppercase",
              }}
            >
              ● Données à vérifier
            </div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 22,
                fontWeight: 800,
                color: K.ink,
                letterSpacing: -0.6,
                marginTop: 2,
              }}
            >
              Casier {number}
            </div>
            {studentName && (
              <div style={{ fontSize: 12.5, color: K.ink3, fontWeight: 700 }}>
                {studentName}
              </div>
            )}
          </div>
        </div>

        {conflicts.map((c, i) => (
          <div
            key={i}
            style={{
              background: K.pinkSoft,
              borderRadius: 18,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Pill tone="danger">{c.field}</Pill>
              <span
                style={{
                  fontFamily: K.display,
                  fontSize: 14.5,
                  fontWeight: 800,
                  color: "#B2245A",
                }}
              >
                {titleOf(c)}
              </span>
            </div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: K.ink2,
                lineHeight: 1.6,
              }}
            >
              {c.values}
            </div>
            {c.otherNumber && (
              <div style={{ fontSize: 12.5, color: K.ink3, fontWeight: 700 }}>
                Autre casier concerné :{" "}
                <span style={{ fontFamily: K.mono, color: K.ink }}>
                  {c.otherNumber}
                </span>
              </div>
            )}
          </div>
        ))}

        <div
          style={{
            fontSize: 13,
            color: K.ink3,
            fontWeight: 600,
            lineHeight: 1.6,
            background: K.surfaceCool,
            borderRadius: 14,
            padding: "12px 16px",
          }}
        >
          Cela ne vous empêche pas de continuer. Vérifiez le cadenas que vous
          avez en main avant de communiquer le code à l&apos;élève, et signalez
          l&apos;écart à la personne qui tient le fichier.
        </div>

        <Btn
          kind="primary"
          size="lg"
          full
          icon={Icons.check({ size: 20, stroke: "#fff" })}
          onClick={onClose}
        >
          Continuer quand même
        </Btn>
      </div>
    </div>
  );
}
