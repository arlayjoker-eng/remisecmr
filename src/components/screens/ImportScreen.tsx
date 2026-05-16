"use client";
// Admin CSV import — students.csv and lockers.csv.
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Icons } from "@/components/ui";

type Result = { imported: number; total: number; errors: string[] } | null;

export default function ImportScreen() {
  const router = useRouter();
  const [studentRes, setStudentRes] = React.useState<Result>(null);
  const [lockerRes, setLockerRes] = React.useState<Result>(null);
  const [busy, setBusy] = React.useState<"" | "students" | "lockers">("");
  const [err, setErr] = React.useState("");

  const upload = async (
    kind: "students" | "lockers",
    file: File | undefined,
  ) => {
    if (!file) return;
    setBusy(kind);
    setErr("");
    try {
      const text = await file.text();
      const res = await fetch(`/api/${kind}/import`, {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Échec de l'import");
      if (kind === "students") setStudentRes(j);
      else setLockerRes(j);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  };

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
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
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
              Importer les données
            </div>
          </div>
          <Btn
            kind="ghostDark"
            size="md"
            icon={Icons.back({ size: 20, stroke: "#fff" })}
            onClick={() => router.push("/scan")}
          >
            Retour
          </Btn>
        </div>

        {err && (
          <div
            style={{
              background: K.red,
              borderRadius: 14,
              padding: "12px 18px",
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            {err}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
          }}
        >
          <UploadCard
            title="Élèves"
            kind="students"
            hint="id, code, first_name, last_name, group, device, serial, accessories, tutor_name, tutor_phone, paid"
            accent={K.violet}
            busy={busy === "students"}
            result={studentRes}
            onFile={(f) => upload("students", f)}
          />
          <UploadCard
            title="Casiers"
            kind="lockers"
            hint="locker_number, owner_id, brand, code, aisle"
            accent={K.teal}
            busy={busy === "lockers"}
            result={lockerRes}
            onFile={(f) => upload("lockers", f)}
          />
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: 12.5,
            color: "rgba(255,255,255,0.6)",
            fontFamily: K.mono,
          }}
        >
          Les imports utilisent un upsert : ré-importer un fichier met à jour
          les fiches existantes sans créer de doublons.
        </div>
      </div>
    </div>
  );
}

function UploadCard({
  title,
  kind,
  hint,
  accent,
  busy,
  result,
  onFile,
}: {
  title: string;
  kind: string;
  hint: string;
  accent: string;
  busy: boolean;
  result: Result;
  onFile: (f: File | undefined) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
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
          fontSize: 20,
          fontWeight: 800,
          color: K.ink,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: K.mono,
          fontSize: 11,
          color: K.ink3,
          background: K.surfaceCool,
          borderRadius: 10,
          padding: "10px 12px",
          lineHeight: 1.5,
        }}
      >
        {hint}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Btn
        kind="primary"
        size="md"
        full
        disabled={busy}
        icon={Icons.download({ size: 20, stroke: "#fff" })}
        onClick={() => inputRef.current?.click()}
        style={{ background: accent }}
      >
        {busy ? "Import en cours…" : `Choisir un fichier .csv`}
      </Btn>
      {result && (
        <div
          style={{
            background: K.greenSoft,
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 13,
            fontWeight: 700,
            color: "#1F8A47",
          }}
        >
          {result.imported} / {result.total} lignes importées.
          {result.errors.length > 0 && (
            <ul
              style={{
                margin: "8px 0 0",
                paddingLeft: 18,
                color: "#B2245A",
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {result.errors.slice(0, 6).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
