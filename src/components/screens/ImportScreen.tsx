"use client";
// Admin CSV import — listes Portables, Casiers (élèves) et catalogue de casiers.
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Icons } from "@/components/ui";

type Result = {
  ok: boolean;
  total: number;
  imported: number;
  errors: string[];
} | null;

const LAPTOP_HEADERS =
  "student_number,first_name,last_name,email,group,box_number,laptop_serial,laptop_model";
const CASIER_STUDENT_HEADERS = "student_number,first_name,last_name,group";
const LOCKER_CATALOG_HEADERS = "locker_number,serial_number,combination_code";

function downloadTemplate(filename: string, headers: string) {
  const blob = new Blob(["﻿" + headers + "\r\n"], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportScreen() {
  const router = useRouter();

  return (
    <div
      style={{
        height: "100%",
        background: K.bg,
        color: "#fff",
        fontFamily: K.body,
        padding: 40,
        overflow: "auto",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 11,
                fontWeight: 800,
                color: "#B589F0",
                letterSpacing: 1.6,
                textTransform: "uppercase",
              }}
            >
              ● RemiseCMR · Administration
            </div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: -1,
                marginTop: 4,
              }}
            >
              Importer les listes
            </div>
          </div>
          <Btn
            kind="ghostDark"
            size="md"
            icon={Icons.back({ size: 20, stroke: "#fff" })}
            onClick={() => router.push("/admin")}
          >
            Annuler
          </Btn>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <UploadSection
            title="Liste des élèves recevant un PORTABLE"
            endpoint="/api/admin/import/laptops"
            headers={LAPTOP_HEADERS}
            templateName="modele_portables.csv"
            accent={K.violet}
            needsLevel
          />
          <UploadSection
            title="Liste des élèves recevant un CASIER"
            endpoint="/api/admin/import/lockers"
            headers={CASIER_STUDENT_HEADERS}
            templateName="modele_casiers_eleves.csv"
            accent={K.teal}
            needsLevel
          />
          <UploadSection
            title="Catalogue des casiers (numéro · série · code)"
            endpoint="/api/admin/import/lockers-catalog"
            headers={LOCKER_CATALOG_HEADERS}
            templateName="modele_catalogue_casiers.csv"
            accent={K.orange}
          />
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: 12.5,
            color: "rgba(255,255,255,0.6)",
            fontFamily: K.mono,
            lineHeight: 1.6,
          }}
        >
          Listes d&apos;élèves : sélectionnez le niveau (Sec 1 à 5) avant
          d&apos;importer — il s&apos;applique à toutes les lignes du fichier.
          Catalogue des casiers : crée les casiers disponibles ; l&apos;opérateur
          en choisit un au scan. Import atomique : une seule erreur annule tout.
          Ré-importer met à jour sans créer de doublons.
        </div>
      </div>
    </div>
  );
}

const LEVELS = ["1", "2", "3", "4", "5"];

function UploadSection({
  title,
  endpoint,
  headers,
  templateName,
  accent,
  needsLevel,
}: {
  title: string;
  endpoint: string;
  headers: string;
  templateName: string;
  accent: string;
  needsLevel?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<Result>(null);
  const [fileName, setFileName] = React.useState("");
  const [level, setLevel] = React.useState("");

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const url =
        needsLevel && level ? `${endpoint}?level=${level}` : endpoint;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/csv;charset=utf-8" },
        body: text,
      });
      const j = await res.json();
      setResult(j as Result);
    } catch (e) {
      setResult({
        ok: false,
        total: 0,
        imported: 0,
        errors: [`Erreur réseau: ${(e as Error).message}`],
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const blocked = needsLevel && !level;

  return (
    <div
      style={{
        background: "#fff",
        color: K.ink,
        borderRadius: 24,
        padding: 24,
        boxShadow: "0 24px 60px rgba(15,0,60,0.35)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          fontFamily: K.display,
          fontSize: 18,
          fontWeight: 800,
          color: K.ink,
        }}
      >
        {title}
      </div>

      {needsLevel && (
        <div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 11,
              fontWeight: 800,
              color: K.ink3,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Niveau de cette liste
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {LEVELS.map((lv) => {
              const on = level === lv;
              return (
                <button
                  key={lv}
                  onClick={() => setLevel(lv)}
                  style={{
                    border: on
                      ? `2px solid ${accent}`
                      : `2px solid ${K.lineStrong}`,
                    background: on ? accent : K.surfaceCool,
                    color: on ? "#fff" : K.ink2,
                    borderRadius: 12,
                    padding: "10px 18px",
                    fontFamily: K.display,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Sec {lv}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        style={{
          fontFamily: K.mono,
          fontSize: 11,
          color: K.ink3,
          background: K.surfaceCool,
          borderRadius: 10,
          padding: "10px 12px",
          lineHeight: 1.5,
          wordBreak: "break-word",
        }}
      >
        {headers}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={(e) => upload(e.target.files?.[0])}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Btn
          kind="ghost"
          size="md"
          icon={Icons.download({ size: 18 })}
          onClick={() => downloadTemplate(templateName, headers)}
        >
          Télécharger le modèle CSV
        </Btn>
        <Btn
          kind="primary"
          size="md"
          disabled={busy || blocked}
          icon={Icons.doc({ size: 18, stroke: "#fff" })}
          onClick={() => inputRef.current?.click()}
          style={{ background: blocked ? undefined : accent }}
        >
          {busy
            ? "Import en cours…"
            : blocked
              ? "Choisissez d'abord le niveau"
              : needsLevel
                ? `Choisir le fichier CSV (Sec ${level})`
                : "Choisir un fichier CSV"}
        </Btn>
        {result && (
          <Btn kind="ghost" size="md" onClick={() => setResult(null)}>
            Effacer
          </Btn>
        )}
      </div>

      {result && (
        <div
          style={{
            background: result.ok ? K.greenSoft : K.pinkSoft,
            borderRadius: 14,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: result.ok ? "#1F8A47" : "#B2245A",
            }}
          >
            {result.ok
              ? `✓ ${result.imported} / ${result.total} lignes importées${fileName ? ` — ${fileName}` : ""}`
              : `✗ Import annulé — ${result.errors.length} erreur(s) sur ${result.total} ligne(s)`}
          </div>
          {result.errors.length > 0 && (
            <ul
              style={{
                margin: "10px 0 0",
                paddingLeft: 18,
                color: "#B2245A",
                fontWeight: 600,
                fontSize: 12.5,
                lineHeight: 1.6,
                maxHeight: 200,
                overflow: "auto",
              }}
            >
              {result.errors.slice(0, 50).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {result.errors.length > 50 && (
                <li>… et {result.errors.length - 50} autre(s)</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
