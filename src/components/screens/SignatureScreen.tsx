"use client";
// Signature — le parent signe dans le document (flux PORTABLE).
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Pill, Icons, Spinner } from "@/components/ui";
import SavingProgress from "@/components/screens/SavingProgress";
import SuccessCheer from "@/components/screens/SuccessCheer";
import type { ClientStudent } from "@/lib/mappers";

const C = K;

export default function SignatureScreen({
  student,
  operatorName,
}: {
  student: ClientStudent;
  operatorName: string;
}) {
  const router = useRouter();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [hasSigned, setHasSigned] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);
  const [tutorName, setTutorName] = React.useState("");
  const [tutorId, setTutorId] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [celebrating, setCelebrating] = React.useState(false);
  const [error, setError] = React.useState("");
  const drawing = React.useRef(false);
  const last = React.useRef({ x: 0, y: 0 });
  const postRef = React.useRef<Promise<Response> | null>(null);

  const folio = `AE-26-${student.studentNumber}`;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0A1A4A";
    ctx.lineWidth = 2.2;
  }, []);

  const pos = (e: any) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  };
  const start = (e: any) => {
    if (saved) return;
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e: any) => {
    if (!drawing.current || saved) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasSigned) setHasSigned(true);
  };
  const end = () => {
    drawing.current = false;
  };
  const clear = () => {
    if (saved) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const canSave =
    hasSigned && accepted && tutorName.trim().length > 4 && !saved && !saving;

  const save = () => {
    if (!canSave) return;
    setError("");
    setSaving(true);
    const signaturePngDataUrl = canvasRef.current!.toDataURL("image/png");
    postRef.current = fetch("/api/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentNumber: student.studentNumber,
        tutorName: tutorName.trim(),
        tutorIdLast4: tutorId.trim(),
        signaturePngDataUrl,
      }),
    });
  };

  const onProgressDone = async () => {
    try {
      const res = await postRef.current!;
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "save_failed");
      }
      setSaving(false);
      setSaved(true);
      setCelebrating(true);
    } catch {
      setSaving(false);
      setError("L'enregistrement a échoué. Vérifiez la connexion et réessayez.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#EDEAE3",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 22px",
          background: "#F6F4EE",
          borderBottom: `1px solid ${C.lineStrong}`,
          color: C.ink,
        }}
      >
        <button
          onClick={() => router.push(`/student/${student.studentNumber}`)}
          disabled={saving || saved}
          style={{
            width: 48,
            height: 48,
            borderRadius: 13,
            border: `1px solid ${C.lineStrong}`,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: saving || saved ? "not-allowed" : "pointer",
            color: C.ink,
            opacity: saving || saved ? 0.4 : 1,
          }}
        >
          {Icons.back({ size: 20 })}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ color: "oklch(0.55 0.18 27)" }}>
            {Icons.doc({ size: 22, stroke: "currentColor" })}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>
              Accusé de réception — Réf. {folio}
            </div>
            <div style={{ fontSize: 11, color: C.ink3, fontFamily: C.mono }}>
              recepisse_{folio}.pdf · 1 page
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {saved ? (
          <Pill tone="success" icon={Icons.check({ size: 14 })}>
            Enregistré
          </Pill>
        ) : (
          <Pill tone="warn">En attente de signature</Pill>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "24px 24px 130px",
          display: "flex",
          justifyContent: "center",
          background:
            "repeating-linear-gradient(45deg, #EDEAE3 0 12px, #E7E4DC 12px 24px)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 920,
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 18px 40px rgba(20,24,35,0.16)",
            padding: "44px 56px 36px",
            position: "relative",
            fontSize: 13,
            color: C.ink2,
            lineHeight: 1.55,
            minHeight: 720,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {saved && (
            <div
              style={{
                position: "absolute",
                top: 60,
                right: 40,
                transform: "rotate(-8deg)",
                border: "3px solid oklch(0.55 0.18 150)",
                color: "oklch(0.45 0.16 150)",
                padding: "10px 22px",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: 2,
                fontFamily: C.mono,
                background: "rgba(255,255,255,0.7)",
                pointerEvents: "none",
                zIndex: 5,
              }}
            >
              SIGNÉ ET ENREGISTRÉ
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  background: "#fff",
                  padding: 4,
                  border: `1px solid ${C.line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/cmr-logo.png"
                  alt="CMR"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: C.ink,
                    letterSpacing: -0.3,
                  }}
                >
                  Collège Mont-Royal
                </div>
                <div style={{ fontSize: 11, color: C.ink3, fontWeight: 600 }}>
                  Campus principal · Année scolaire 2025–2026 · Programme 1:1
                </div>
              </div>
            </div>
            <div
              style={{
                textAlign: "right",
                fontFamily: C.mono,
                fontSize: 11,
                color: C.ink3,
              }}
            >
              <div style={{ fontWeight: 700, color: C.ink, fontSize: 13 }}>
                {folio}
              </div>
              <div>{new Date().toLocaleDateString("fr-FR")}</div>
            </div>
          </div>

          <div style={{ height: 2, background: C.primary, opacity: 0.85 }} />

          <div>
            <div
              style={{
                fontSize: 11,
                color: C.ink3,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                marginBottom: 4,
              }}
            >
              Document officiel
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: C.ink,
                letterSpacing: -0.6,
              }}
            >
              Accusé de réception d&apos;équipement scolaire
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 13.5 }}>
            Il est constaté que le parent soussigné reçoit en{" "}
            <strong>bonne et due forme</strong>, en{" "}
            <strong>bon état physique et de fonctionnement</strong>,
            l&apos;équipement décrit ci-dessous, attribué à son enfant dans le
            cadre du Programme 1:1 de l&apos;établissement.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px 28px",
              padding: "18px 22px",
              borderRadius: 10,
              background: "#FBFAF6",
              border: `1px solid ${C.line}`,
            }}
          >
            <DocField
              label="Élève"
              value={`${student.firstName} ${student.lastName}`}
            />
            <DocField label="Numéro d'élève" value={student.studentNumber} mono />
            <DocField label="Groupe" value={student.group} />
            <DocField label="Niveau" value={`Secondaire ${student.level}`} />
            <DocField label="Boîte N°" value={student.boxNumber || "—"} mono />
            <DocField
              label="Modèle du portable"
              value={student.laptopModel || "—"}
              span
            />
            <DocField
              label="Numéro de série"
              value={student.laptopSerial || "—"}
              mono
            />
            <DocField
              label="Parent responsable"
              value={tutorName || "—"}
              span
            />
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                color: C.ink3,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 6,
              }}
            >
              Conditions et engagements
            </div>
            <ol
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 12.5,
                lineHeight: 1.6,
                color: C.ink2,
              }}
            >
              <li>
                L&apos;équipement reste la propriété de l&apos;établissement et
                est remis en prêt pour l&apos;année scolaire 2025–2026.
              </li>
              <li>
                Le parent s&apos;engage à un usage responsable et au bon
                entretien de l&apos;équipement.
              </li>
              <li>
                Toute perte, vol ou dommage doit être signalé dans un délai
                maximum de 48 heures.
              </li>
              <li>
                L&apos;équipement devra être rendu à la fin de l&apos;année
                scolaire, hors usure normale.
              </li>
            </ol>
          </div>

          <div
            style={{
              marginTop: 6,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
            }}
          >
            <div>
              <div
                style={{
                  height: 110,
                  borderBottom: `1.5px solid ${C.ink}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  background: "#FBFAF6",
                  borderRadius: "8px 8px 0 0",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: C.ink3,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Remis par (session active)
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: C.ink,
                    textAlign: "center",
                  }}
                >
                  {operatorName}
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: C.ink3,
                  marginTop: 6,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.7,
                }}
              >
                Remise · Opérateur
              </div>
            </div>

            <div>
              <div
                style={{
                  height: 110,
                  position: "relative",
                  borderBottom: `1.5px solid ${
                    hasSigned ? C.ink : "oklch(0.88 0.08 90)"
                  }`,
                  background:
                    hasSigned || saved ? "transparent" : "oklch(0.995 0.012 95)",
                  borderRadius: "8px 8px 0 0",
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{
                    width: "100%",
                    height: "100%",
                    touchAction: "none",
                    cursor: saved ? "default" : "crosshair",
                  }}
                  onMouseDown={start}
                  onMouseMove={move}
                  onMouseUp={end}
                  onMouseLeave={end}
                  onTouchStart={start}
                  onTouchMove={move}
                  onTouchEnd={end}
                />
                {!hasSigned && !saved && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                      gap: 6,
                    }}
                  >
                    <div style={{ color: "oklch(0.65 0.10 90)", opacity: 0.7 }}>
                      {Icons.pen({ size: 26, stroke: "currentColor" })}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "oklch(0.55 0.06 90)",
                      }}
                    >
                      Signez ici avec le doigt
                    </div>
                  </div>
                )}
                {hasSigned && !saved && (
                  <button
                    onClick={clear}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: `1px solid ${C.lineStrong}`,
                      background: "#fff",
                      color: C.ink2,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Effacer
                  </button>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: C.ink3,
                  marginTop: 6,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.7,
                }}
              >
                Reçoit · Parent responsable
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: C.ink,
                  marginTop: 2,
                }}
              >
                {tutorName || "—"}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "auto",
              paddingTop: 16,
              borderTop: `1px solid ${C.line}`,
              fontSize: 10,
              color: C.ink3,
              fontFamily: C.mono,
            }}
          >
            Document horodaté et archivé · empreinte SHA-256 · RemiseCMR
          </div>
        </div>
      </div>

      {!saved && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "14px 22px",
            background: "rgba(246,244,238,0.96)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: `1px solid ${C.lineStrong}`,
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: C.ink,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flex: 1,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <div style={toolbarLabel}>Nom du parent</div>
              <input
                value={tutorName}
                onChange={(e) => setTutorName(e.target.value)}
                placeholder="Prénom et nom du parent"
                style={{ ...toolbarInput, minWidth: 220 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={toolbarLabel}>CNI — 4 derniers</div>
              <input
                value={tutorId}
                onChange={(e) =>
                  setTutorId(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="0000"
                maxLength={4}
                style={{
                  ...toolbarInput,
                  width: 100,
                  fontFamily: C.mono,
                  letterSpacing: 2,
                }}
              />
            </div>
            <div
              onClick={() => setAccepted(!accepted)}
              style={{
                marginLeft: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 10,
                border: `1px solid ${accepted ? C.success : C.lineStrong}`,
                background: accepted ? C.successSoft : "#fff",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: accepted ? C.success : "transparent",
                  border: `1.5px solid ${accepted ? C.success : C.lineStrong}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {accepted &&
                  Icons.check({ size: 14, stroke: "#fff", strokeWidth: 3 })}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.ink,
                  maxWidth: 220,
                  lineHeight: 1.3,
                }}
              >
                J&apos;accepte les conditions et autorise l&apos;archivage de
                l&apos;acte
              </div>
            </div>
          </div>
          <Btn
            kind="success"
            size="lg"
            icon={
              saving ? <Spinner /> : Icons.download({ size: 22, stroke: "#fff" })
            }
            disabled={!canSave}
            onClick={save}
          >
            {saving ? "Enregistrement…" : "Enregistrer le PDF signé"}
          </Btn>
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            bottom: 96,
            left: "50%",
            transform: "translateX(-50%)",
            background: K.red,
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 13,
            zIndex: 60,
          }}
        >
          {error}
        </div>
      )}

      {saving && <SavingProgress folio={folio} onDone={onProgressDone} />}

      {celebrating && (
        <SuccessCheer
          tutorName={tutorName}
          folio={folio}
          onContinue={() =>
            router.push(`/student/${student.studentNumber}/receipt`)
          }
          onDownload={() =>
            window.open(`/api/deliveries/${folio}/pdf`, "_blank", "noopener")
          }
        />
      )}
    </div>
  );
}

const toolbarLabel: React.CSSProperties = {
  fontSize: 10,
  color: C.ink3,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.8,
};

const toolbarInput: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${C.lineStrong}`,
  borderRadius: 10,
  color: C.ink,
  height: 40,
  padding: "0 14px",
  fontSize: 14,
  fontWeight: 600,
  outline: "none",
};

function DocField({
  label,
  value,
  mono,
  span,
}: {
  label: string;
  value: string;
  mono?: boolean;
  span?: boolean;
}) {
  return (
    <div style={{ gridColumn: span ? "1 / -1" : "auto" }}>
      <div
        style={{
          fontSize: 10,
          color: C.ink3,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.7,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: C.ink,
          fontFamily: mono ? C.mono : K.display,
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}
