"use client";
// Poste réception — annonce un élève au poste de remise des portables.
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Pill, Icons, Spinner } from "@/components/ui";

type Sib = {
  studentNumber: string;
  firstName: string;
  lastName: string;
  group: string;
  level: string;
};

type IncomingItem = {
  announcedAt: string;
  student: Sib;
};

export default function ReceptionScreen({
  operatorName,
}: {
  operatorName: string;
}) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [flash, setFlash] = React.useState<
    | { kind: "ok"; student: Sib }
    | { kind: "err"; message: string }
    | null
  >(null);
  const [incoming, setIncoming] = React.useState<IncomingItem[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Charger les annonces actives + poll toutes les 5 s
  const refresh = React.useCallback(async () => {
    try {
      const r = await fetch("/api/reception/incoming");
      if (r.ok) setIncoming(await r.json());
    } catch {
      /* réseau */
    }
  }, []);
  React.useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const announce = async () => {
    const v = code.trim();
    if (!v || busy) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch("/api/reception/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentNumber: v }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Erreur");
      setFlash({ kind: "ok", student: j.student });
      setCode("");
      refresh();
      // Refocus pour le prochain scan
      setTimeout(() => inputRef.current?.focus(), 100);
      // Disparait après 4 s
      setTimeout(() => setFlash(null), 4000);
    } catch (e) {
      setFlash({ kind: "err", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        height: "100%",
        background: K.bg,
        color: "#fff",
        fontFamily: K.body,
        padding: 32,
        overflow: "auto",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
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
              ● RemiseCMR · Réception · {operatorName}
            </div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: -1,
                marginTop: 4,
              }}
            >
              Annoncer un élève au poste portable
            </div>
          </div>
          <Btn
            kind="ghostDark"
            size="md"
            icon={Icons.back({ size: 20, stroke: "#fff" })}
            onClick={() => router.push("/")}
          >
            Retour
          </Btn>
        </div>

        {/* Barre de scan */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 20,
            padding: 22,
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 18px 40px rgba(15,0,60,0.30)",
            marginBottom: 14,
          }}
        >
          {Icons.scan({ size: 28, stroke: K.ink2 })}
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") announce();
            }}
            placeholder="Scanner ou saisir le numéro d'élève…"
            autoFocus
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: K.display,
              fontSize: 22,
              fontWeight: 700,
              color: K.ink,
              letterSpacing: 0.4,
            }}
          />
          {busy && <Spinner />}
          <Btn
            kind="success"
            size="lg"
            disabled={busy || !code.trim()}
            icon={Icons.check({ size: 22, stroke: "#fff" })}
            onClick={announce}
          >
            Annoncer
          </Btn>
        </div>

        {/* Flash */}
        {flash && flash.kind === "ok" && (
          <div
            style={{
              background: K.greenSoft,
              color: "#1F8A47",
              borderRadius: 16,
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 28 }}>✓</div>
            <div>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                {flash.student.firstName} {flash.student.lastName} annoncé
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                {flash.student.studentNumber} · {flash.student.group} ·
                Secondaire {flash.student.level}
              </div>
            </div>
          </div>
        )}
        {flash && flash.kind === "err" && (
          <div
            style={{
              background: K.pinkSoft,
              color: "#B2245A",
              borderRadius: 16,
              padding: "14px 18px",
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            ✗ {flash.message}
          </div>
        )}

        {/* File des élèves en route */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 20,
            padding: 18,
            boxShadow: "0 14px 30px rgba(15,0,60,0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontFamily: K.display,
                fontSize: 12,
                fontWeight: 800,
                color: K.ink3,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Élèves en route vers le poste portable
            </div>
            <Pill tone="primary">{incoming.length}</Pill>
          </div>
          {incoming.length === 0 ? (
            <div
              style={{
                color: K.ink3,
                fontWeight: 600,
                fontSize: 13,
                padding: "12px 0",
              }}
            >
              Aucun élève annoncé pour le moment.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {incoming.map((it) => (
                <div
                  key={it.student.studentNumber}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    background: K.surfaceCool,
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: K.violet,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    Sec {it.student.level}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: K.display,
                        fontWeight: 800,
                        fontSize: 14,
                        color: K.ink,
                      }}
                    >
                      {it.student.firstName} {it.student.lastName}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: K.ink3,
                        fontWeight: 700,
                      }}
                    >
                      <span style={{ fontFamily: K.mono }}>
                        {it.student.studentNumber}
                      </span>{" "}
                      · {it.student.group}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: K.mono,
                      fontSize: 11,
                      color: K.ink3,
                      fontWeight: 700,
                    }}
                  >
                    {new Date(it.announcedAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
