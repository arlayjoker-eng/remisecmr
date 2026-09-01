"use client";
// Briques partagées par les deux fiches de correction de casier : celle du
// comptoir (CasierScreen) et celle des rapports (ReportsScreen). Les règles
// vivent dans @/lib/casier-edit ; ici c'est leur rendu — champs, indice de
// niveau et panneau de confirmation — pour que les deux écrans se lisent et se
// comportent pareil.
import React from "react";
import { K, Btn, Pill, Icons, Spinner } from "@/components/ui";
import { Alert } from "@/components/screens/StudentScreen";
import { levelFromGrado } from "@/lib/level";

/** Réponse d'un appel « preview » à l'une ou l'autre des routes d'édition. */
export type EditPreview = {
  ok: boolean;
  changes: { label: string; before: string; after: string }[];
  warnings: string[];
  conflicts: string[];
};

const LEVELS = ["1", "2", "3", "4", "5"];

/** Titre de section : « ● ÉLÈVE ». Sépare les groupes de champs. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: K.display,
        fontSize: 11,
        fontWeight: 800,
        color: K.ink3,
        letterSpacing: 1.4,
        textTransform: "uppercase",
      }}
    >
      ● {children}
    </div>
  );
}

/** Champ texte pleine largeur, taille confortable au doigt (kiosque iPad). */
export function EditRow({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          fontFamily: K.display,
          fontSize: 12,
          fontWeight: 800,
          color: K.ink2,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: K.surfaceCool,
          border: `2px solid ${K.lineStrong}`,
          borderRadius: 16,
          padding: "16px 16px",
          fontFamily: mono ? K.mono : K.display,
          fontSize: 17,
          fontWeight: 800,
          color: K.ink,
          outline: "none",
        }}
      />
    </label>
  );
}

/**
 * Le niveau déduit du groupe, en direct sous le champ, plus l'avertissement
 * quand il change. L'opérateur voit le saut AVANT de valider — le casier, lui,
 * n'est jamais changé automatiquement.
 */
export function LevelHint({
  group,
  currentGroup,
  currentLevel,
  lockerNumber,
}: {
  group: string;
  currentGroup: string;
  currentLevel: string;
  lockerNumber: string;
}) {
  const g = group.trim();
  const derived = levelFromGrado("", g);
  const known = LEVELS.includes(derived);
  const shift = g !== "" && g !== currentGroup && known && derived !== currentLevel;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12.5, color: K.ink3, fontWeight: 700 }}>
          Niveau déduit :
        </span>
        <Pill tone={shift ? "warn" : "neutral"}>
          {known ? `Secondaire ${derived}` : "indéterminé"}
        </Pill>
      </div>
      {shift && (
        <Alert
          tone="amber"
          title={`Changement de niveau : Secondaire ${currentLevel} → ${derived}`}
          text={
            lockerNumber
              ? `Le casier ${lockerNumber} pourrait ne pas correspondre au nouveau niveau. Il n'est PAS changé automatiquement — vérifiez-le.`
              : "Le niveau suivra le groupe. Le casier n'est jamais changé automatiquement."
          }
        />
      )}
    </>
  );
}

/**
 * Deuxième temps de l'édition : ce qui va changer, ce qu'il faut vérifier, ce
 * qui bloque. Tant qu'un conflit subsiste, le bouton d'enregistrement reste
 * inactif — l'opérateur ne peut pas valider quelque chose que le serveur
 * refusera.
 */
export function EditPreviewPanel({
  preview,
  busy,
  onBack,
  onConfirm,
}: {
  preview: EditPreview;
  busy: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const blocked = preview.conflicts.length > 0;
  const nothing = preview.changes.length === 0 && !blocked;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionTitle>Confirmer les changements</SectionTitle>

      {nothing && (
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: K.ink3,
            padding: "14px 16px",
            background: K.surfaceCool,
            borderRadius: 16,
          }}
        >
          Aucun changement à enregistrer.
        </div>
      )}

      {preview.changes.map((c) => (
        <div
          key={c.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            padding: "12px 16px",
            borderRadius: 16,
            background: K.greenSoft,
          }}
        >
          <span
            style={{
              fontFamily: K.display,
              fontSize: 10.5,
              fontWeight: 800,
              color: "#1F8A47",
              letterSpacing: 1.1,
              textTransform: "uppercase",
              minWidth: 104,
            }}
          >
            {c.label}
          </span>
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: K.ink3,
              textDecoration: "line-through",
            }}
          >
            {c.before}
          </span>
          <span style={{ color: K.ink4, fontWeight: 800 }}>→</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: K.ink }}>
            {c.after}
          </span>
        </div>
      ))}

      {preview.warnings.map((w, i) => (
        <Alert key={`w${i}`} tone="amber" title="À vérifier" text={w} />
      ))}
      {preview.conflicts.map((c, i) => (
        <Alert key={`c${i}`} tone="red" title="Impossible" text={c} />
      ))}

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <Btn kind="ghost" size="lg" onClick={onBack} style={{ flex: 1 }}>
          Retour
        </Btn>
        <Btn
          kind="success"
          size="lg"
          disabled={busy || blocked || preview.changes.length === 0}
          icon={busy ? <Spinner /> : Icons.check({ size: 20, stroke: "#fff" })}
          onClick={onConfirm}
          style={{ flex: 2 }}
        >
          {busy ? "Enregistrement…" : "Confirmer et enregistrer"}
        </Btn>
      </div>
    </div>
  );
}
