"use client";
// Casier (locker) assignment — no signature, just a DB write.
// Port of `screen-casier-kido.jsx`, wired to PATCH /api/lockers/:id.
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Pill, KV, Avatar, TileIcon, Icons, Spinner } from "@/components/ui";

type Student = {
  id: string;
  code: string;
  first: string;
  last: string;
  group: string;
  tutor: string;
  tutorPhone: string;
  color: number;
};

type Locker = {
  id: string;
  ownerId: string;
  number: string;
  code: string;
  brand: string;
  aisle: string;
  status: string;
  binomeId: string | null;
};

type Props = {
  student: Student;
  locker: Locker;
  primaryStudent: Student;
  binomeStudent: Student | null;
  operatorName: string;
  eligibleBinomes: Student[];
};

export default function CasierScreen({
  student,
  locker,
  primaryStudent,
  binomeStudent,
  operatorName,
  eligibleBinomes,
}: Props) {
  const router = useRouter();
  const viaBinome = student.id !== locker.ownerId;

  const [code, setCode] = React.useState(locker.code);
  const [showBinome, setShowBinome] = React.useState(false);
  const [showCode, setShowCode] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const isDelivered = locker.status === "delivered";

  const patchLocker = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/lockers/${locker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Échec de la mise à jour.");
      }
      setBusy(false);
      return true;
    } catch (e) {
      setBusy(false);
      setError((e as Error).message);
      return false;
    }
  };

  const confirm = async () => {
    if (!revealed || busy) return;
    const ok = await patchLocker({ status: "delivered" });
    if (!ok) return;
    setConfirming(true);
    setTimeout(() => {
      router.push("/scan");
      router.refresh();
    }, 1600);
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: K.bg,
        color: "#fff",
        fontFamily: K.body,
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {[
          { x: 6, y: 10, s: 1.4 },
          { x: 48, y: 6, s: 1.8 },
          { x: 92, y: 14, s: 1.0 },
          { x: 14, y: 78, s: 1.2 },
          { x: 88, y: 88, s: 1.6 },
        ].map((p, i) => (
          <svg
            key={i}
            width={12 * p.s}
            height={12 * p.s}
            viewBox="0 0 12 12"
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: 0.35,
            }}
          >
            <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill="#fff" />
          </svg>
        ))}
      </div>

      {/* Left: identity + binôme */}
      <div
        style={{
          flex: 1,
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          position: "relative",
          zIndex: 2,
          minWidth: 0,
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => router.push("/scan")}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              border: "none",
              background: "rgba(255,255,255,0.14)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Icons.back({ size: 22, stroke: "#fff" })}
          </button>
          <div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 11,
                fontWeight: 800,
                color: "#6AE3A8",
                letterSpacing: 1.4,
                textTransform: "uppercase",
              }}
            >
              ● Mode Casier · {operatorName}
            </div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: -0.4,
                marginTop: 2,
              }}
            >
              {viaBinome
                ? "Casier partagé · binôme reconnu"
                : isDelivered
                  ? "Casier déjà remis"
                  : "Attribuer le casier"}
            </div>
          </div>
        </div>

        {viaBinome && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 18px",
              borderRadius: 16,
              background: "rgba(255,210,63,0.18)",
              border: "1px solid rgba(255,210,63,0.40)",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "#FFD23F",
                color: "#1B0F45",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 3px 0 #C99917",
                fontFamily: K.display,
                fontWeight: 800,
              }}
            >
              2
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                Casier {locker.number} déjà attribué à {primaryStudent.first}{" "}
                {primaryStudent.last}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "rgba(255,255,255,0.75)",
                  fontWeight: 600,
                }}
              >
                Ajouté manuellement comme binôme · même cadenas, même code
              </div>
            </div>
          </div>
        )}

        {/* Identity card */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 28,
            padding: 22,
            boxShadow: "0 24px 60px rgba(15,0,60,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginBottom: 14,
            }}
          >
            <Avatar student={student} size={80} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 11,
                  fontWeight: 800,
                  color: K.violet,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                }}
              >
                {student.group}
              </div>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 26,
                  fontWeight: 800,
                  color: K.ink,
                  letterSpacing: -0.8,
                  lineHeight: 1.05,
                  marginTop: 4,
                }}
              >
                {student.first} {student.last}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <Pill tone="primary">{student.id}</Pill>
                {viaBinome && <Pill tone="warn">Binôme</Pill>}
                {isDelivered && !viaBinome && (
                  <Pill
                    tone="success"
                    icon={Icons.check({ size: 11, strokeWidth: 2.5 })}
                  >
                    Casier remis
                  </Pill>
                )}
              </div>
            </div>
          </div>

          <KV
            label="Matricule"
            value={student.id}
            mono
            icon={<TileIcon kind="badge" />}
          />
          <KV
            label="Classe / Niveau"
            value={student.group}
            icon={<TileIcon kind="backpack" />}
          />
          <KV
            label="Casier assigné"
            value={locker.number}
            mono
            icon={<TileIcon kind="box" />}
          />
          <KV
            label="Parent responsable"
            value={student.tutor}
            icon={<TileIcon kind="family" />}
          />
          <KV
            label="Téléphone du parent"
            value={student.tutorPhone}
            mono
            icon={<TileIcon kind="phone" />}
          />
        </div>

        {/* Binôme section */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 28,
            padding: 22,
            boxShadow: "0 24px 60px rgba(15,0,60,0.35)",
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
            <div>
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
                ● Binôme (2ᵉ élève)
              </div>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 22,
                  fontWeight: 800,
                  color: K.ink,
                  letterSpacing: -0.4,
                  marginTop: 2,
                }}
              >
                {binomeStudent ? "Partagé avec" : "Aucun binôme"}
              </div>
            </div>
            {!viaBinome && !isDelivered && (
              <Btn
                kind={binomeStudent ? "ghost" : "soft"}
                size="sm"
                icon={
                  binomeStudent
                    ? null
                    : Icons.sparkle({
                        size: 16,
                        stroke: "currentColor",
                        strokeWidth: 2,
                      })
                }
                onClick={() => setShowBinome(true)}
              >
                {binomeStudent ? "Changer" : "Ajouter un binôme"}
              </Btn>
            )}
          </div>

          {binomeStudent ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                borderRadius: 18,
                background: K.surfaceCool,
                border: `2px dashed ${K.lineStrong}`,
              }}
            >
              <Avatar student={binomeStudent} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: K.display,
                    fontSize: 16,
                    fontWeight: 800,
                    color: K.ink,
                    letterSpacing: -0.3,
                  }}
                >
                  {binomeStudent.first} {binomeStudent.last}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: K.ink3,
                    fontWeight: 700,
                    marginTop: 2,
                  }}
                >
                  {binomeStudent.group} ·{" "}
                  <span style={{ fontFamily: K.mono }}>
                    {binomeStudent.id}
                  </span>
                </div>
              </div>
              {!viaBinome && !isDelivered && (
                <button
                  onClick={async () => {
                    const ok = await patchLocker({ binomeId: null });
                    if (ok) router.refresh();
                  }}
                  style={{
                    border: "none",
                    background: K.pinkSoft,
                    color: "#B2245A",
                    borderRadius: 999,
                    padding: "8px 14px",
                    fontFamily: K.display,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Retirer
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: "20px 16px",
                borderRadius: 18,
                background: K.surfaceCool,
                border: `2px dashed ${K.lineStrong}`,
                textAlign: "center",
                fontSize: 13,
                color: K.ink3,
                fontWeight: 600,
              }}
            >
              Un seul élève occupe ce casier. Ajoutez un binôme pour qu&apos;un
              2ᵉ élève partage le même cadenas.
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />
      </div>

      {/* Right: locker + padlock */}
      <div
        style={{
          width: 520,
          padding: "24px 26px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Locker hero */}
        <div
          style={{
            background: "linear-gradient(135deg, #4ED5D5 0%, #1AA0A0 100%)",
            borderRadius: 28,
            padding: 22,
            color: "#fff",
            boxShadow:
              "0 6px 0 rgba(13,80,80,0.45), 0 24px 60px rgba(26,160,160,0.35)",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                opacity: 0.85,
              }}
            >
              ● Casier attribué
            </div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 52,
                fontWeight: 800,
                letterSpacing: -2,
                lineHeight: 1,
                marginTop: 4,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {locker.number}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                marginTop: 4,
                opacity: 0.92,
              }}
            >
              {locker.aisle}
            </div>
          </div>
          <svg
            width="92"
            height="118"
            viewBox="0 0 120 150"
            style={{ flexShrink: 0 }}
          >
            <rect x="14" y="6" width="92" height="138" rx="8" fill="#fff" opacity="0.18" />
            <rect x="20" y="12" width="80" height="126" rx="6" fill="#fff" />
            <rect
              x="26"
              y="18"
              width="68"
              height="14"
              rx="3"
              fill="#1AA0A0"
              opacity="0.25"
            />
            <text
              x="60"
              y="29"
              fontFamily={K.display}
              fontSize="11"
              fontWeight="800"
              fill="#0D5050"
              textAnchor="middle"
            >
              {locker.number}
            </text>
            <circle cx="84" cy="78" r="6" fill="#1AA0A0" />
            <circle cx="84" cy="78" r="2" fill="#fff" />
            <rect x="26" y="98" width="20" height="2" rx="1" fill="#1AA0A0" opacity="0.4" />
            <rect x="26" y="104" width="32" height="2" rx="1" fill="#1AA0A0" opacity="0.3" />
          </svg>
        </div>

        {/* Padlock + code reveal */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 28,
            padding: 20,
            boxShadow: "0 24px 60px rgba(15,0,60,0.35)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "linear-gradient(135deg, #FFD56B 0%, #FF9A2E 100%)",
                boxShadow: "0 4px 0 rgba(198,101,38,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 44 44">
                <path
                  d="M14 20 Q14 10 22 10 Q30 10 30 20"
                  stroke="#fff"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
                <rect x="10" y="20" width="24" height="18" rx="3" fill="#fff" />
                <circle cx="22" cy="28" r="2.5" fill="#FF9A2E" />
                <rect x="20.5" y="29" width="3" height="5" rx="1" fill="#FF9A2E" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
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
                Cadenas · code d&apos;ouverture
              </div>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 16,
                  fontWeight: 800,
                  color: K.ink,
                  letterSpacing: -0.2,
                }}
              >
                {locker.brand}
              </div>
            </div>
            {!isDelivered && (
              <button
                onClick={() => setShowCode(true)}
                style={{
                  border: "none",
                  background: K.surfaceCool,
                  color: K.violetDeep,
                  borderRadius: 999,
                  padding: "8px 14px",
                  fontFamily: K.display,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {Icons.pen({ size: 13, stroke: "currentColor", strokeWidth: 2.5 })}
                Changer
              </button>
            )}
          </div>

          {/* Code reveal */}
          <div
            onClick={() => !revealed && setRevealed(true)}
            style={{
              background: revealed ? K.ink : K.surfaceCool,
              border: `2px dashed ${revealed ? "transparent" : K.lineStrong}`,
              borderRadius: 20,
              padding: "22px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              cursor: revealed ? "default" : "pointer",
              transition: "all 0.25s",
            }}
          >
            {!revealed ? (
              <>
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
                  Appuyez pour révéler
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 4,
                  }}
                >
                  {["••", "••", "••"].map((b, i) => (
                    <React.Fragment key={i}>
                      <div
                        style={{
                          fontFamily: K.display,
                          fontSize: 32,
                          fontWeight: 800,
                          color: K.ink2,
                          letterSpacing: -1,
                          lineHeight: 1,
                          background: "#fff",
                          padding: "8px 12px",
                          borderRadius: 12,
                          minWidth: 64,
                          textAlign: "center",
                          boxShadow: "0 2px 0 rgba(27,15,69,0.10)",
                        }}
                      >
                        {b}
                      </div>
                      {i < 2 && (
                        <div
                          style={{
                            fontFamily: K.display,
                            fontSize: 22,
                            color: K.ink3,
                            fontWeight: 800,
                          }}
                        >
                          ·
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: K.ink3,
                    fontWeight: 600,
                    marginTop: 4,
                  }}
                >
                  Code masqué · révélé uniquement à l&apos;écran
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontFamily: K.display,
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#FFD23F",
                    letterSpacing: 1.4,
                    textTransform: "uppercase",
                  }}
                >
                  ● Code révélé
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    animation:
                      "mascotIn 0.5s cubic-bezier(0.2,0.9,0.3,1.15) both",
                    marginTop: 4,
                  }}
                >
                  {code.split("-").map((n, i) => (
                    <React.Fragment key={i}>
                      <div
                        style={{
                          fontFamily: K.mono,
                          fontSize: 36,
                          fontWeight: 700,
                          color: "#FFD23F",
                          letterSpacing: -1,
                          lineHeight: 1,
                          background: "rgba(255,210,63,0.12)",
                          padding: "10px 14px",
                          borderRadius: 12,
                          minWidth: 72,
                          textAlign: "center",
                          border: "1.5px solid rgba(255,210,63,0.30)",
                        }}
                      >
                        {n}
                      </div>
                      {i < code.split("-").length - 1 && (
                        <div
                          style={{
                            fontFamily: K.display,
                            fontSize: 24,
                            color: "rgba(255,255,255,0.4)",
                            fontWeight: 800,
                          }}
                        >
                          ·
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 600,
                    marginTop: 4,
                  }}
                >
                  Tournez à droite, gauche, droite
                </div>
              </>
            )}
          </div>

          {error && (
            <div
              style={{
                background: K.pinkSoft,
                color: "#B2245A",
                borderRadius: 12,
                padding: "10px 14px",
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {isDelivered && !viaBinome ? (
              <Btn
                kind="ghost"
                size="lg"
                full
                onClick={() => router.push("/scan")}
                icon={Icons.back({ size: 22 })}
              >
                Retour à la liste
              </Btn>
            ) : (
              <>
                <Btn
                  kind="success"
                  size="lg"
                  full
                  icon={
                    busy || confirming ? (
                      <Spinner />
                    ) : (
                      Icons.check({ size: 22, stroke: "#fff" })
                    )
                  }
                  disabled={!revealed || busy || confirming}
                  onClick={confirm}
                >
                  {confirming
                    ? "Enregistrement…"
                    : revealed
                      ? "Casier remis"
                      : "Révéler le code d'abord"}
                </Btn>
                <Btn
                  kind="ghost"
                  size="md"
                  full
                  onClick={() => router.push("/scan")}
                  icon={Icons.x({ size: 18 })}
                >
                  Annuler
                </Btn>
              </>
            )}
          </div>
        </div>
      </div>

      {showBinome && (
        <BinomePicker
          students={eligibleBinomes}
          current={binomeStudent}
          onCancel={() => setShowBinome(false)}
          onPick={async (picked) => {
            const ok = await patchLocker({ binomeId: picked.id });
            setShowBinome(false);
            if (ok) router.refresh();
          }}
        />
      )}

      {showCode && (
        <ChangeCodeModal
          current={code}
          onCancel={() => setShowCode(false)}
          onSave={async (newCode) => {
            const ok = await patchLocker({ code: newCode });
            if (ok) {
              setCode(newCode);
              setRevealed(true);
              setShowCode(false);
              router.refresh();
            }
          }}
        />
      )}

      {confirming && <CasierCheer student={student} locker={{ ...locker, code }} />}
    </div>
  );
}

// ─── Binôme picker ─────────────────────────────────────────
function BinomePicker({
  students,
  current,
  onCancel,
  onPick,
}: {
  students: Student[];
  current: Student | null;
  onCancel: () => void;
  onPick: (s: Student) => void;
}) {
  const [query, setQuery] = React.useState("");
  const q = query.toLowerCase().trim();
  const list = students
    .filter((s) => {
      if (!q) return true;
      return (
        `${s.first} ${s.last}`.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
      );
    })
    .slice(0, 30);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 80,
        background: "rgba(8,0,31,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "overlayIn 0.3s ease both",
        fontFamily: K.body,
      }}
    >
      <div
        style={{
          width: 580,
          maxHeight: "80%",
          background: "#fff",
          borderRadius: 32,
          padding: 26,
          boxShadow: "0 30px 80px rgba(15,0,60,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          animation: "mascotIn 0.45s cubic-bezier(0.2,0.9,0.3,1.15) both",
          color: K.ink,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 11,
              fontWeight: 800,
              color: K.violet,
              letterSpacing: 1.4,
              textTransform: "uppercase",
            }}
          >
            ● Ajouter un binôme
          </div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 26,
              fontWeight: 800,
              color: K.ink,
              letterSpacing: -0.8,
              marginTop: 4,
            }}
          >
            Chercher le 2ᵉ élève
          </div>
          <div
            style={{
              fontSize: 13,
              color: K.ink3,
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            Tapez son nom ou son matricule.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: K.surfaceCool,
            borderRadius: 16,
            padding: "14px 16px",
            border: `2px solid ${K.lineStrong}`,
          }}
        >
          {Icons.search({ size: 20, stroke: K.ink3 })}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Lucas, ELV-24-0143, A24P0143X…"
            autoFocus
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: K.display,
              fontSize: 16,
              fontWeight: 700,
              color: K.ink,
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            minHeight: 200,
            maxHeight: 360,
            margin: "0 -8px",
            padding: "0 8px",
          }}
        >
          {list.length === 0 && (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: K.ink3,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Aucun élève trouvé pour « {query} »
            </div>
          )}
          {list.map((s) => {
            const isCurrent = current && current.id === s.id;
            return (
              <div
                key={s.id}
                onClick={() => onPick(s)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 12px",
                  borderRadius: 14,
                  cursor: "pointer",
                  marginBottom: 4,
                  background: isCurrent ? K.violetSoft : "transparent",
                  border: isCurrent
                    ? `2px solid ${K.violet}`
                    : "2px solid transparent",
                }}
              >
                <Avatar student={s} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: K.display,
                      fontSize: 15,
                      fontWeight: 800,
                      color: K.ink,
                      letterSpacing: -0.3,
                    }}
                  >
                    {s.first} {s.last}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: K.ink3,
                      marginTop: 2,
                      fontWeight: 700,
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <span>{s.group.split(" — ")[0]}</span>
                    <span style={{ color: K.ink4 }}>·</span>
                    <span style={{ fontFamily: K.mono }}>{s.id}</span>
                  </div>
                </div>
                {isCurrent && <Pill tone="primary">Actuel</Pill>}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, paddingTop: 6 }}>
          <Btn kind="ghost" size="md" onClick={onCancel} style={{ flex: 1 }}>
            Annuler
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Change code modal ─────────────────────────────────────
function ChangeCodeModal({
  current,
  onCancel,
  onSave,
}: {
  current: string;
  onCancel: () => void;
  onSave: (code: string) => void;
}) {
  const parts = current.split("-");
  const [a, setA] = React.useState(parts[0] || "00");
  const [b, setB] = React.useState(parts[1] || "00");
  const [c, setC] = React.useState(parts[2] || "00");
  const valid = [a, b, c].every((v) => /^\d{1,2}$/.test(v));
  const fmt = (v: string) => v.padStart(2, "0");
  const save = () => valid && onSave(`${fmt(a)}-${fmt(b)}-${fmt(c)}`);

  const field = (
    v: string,
    set: (s: string) => void,
    label: string,
  ) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        flex: 1,
      }}
    >
      <input
        value={v}
        onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 2))}
        maxLength={2}
        style={{
          width: "100%",
          height: 84,
          textAlign: "center",
          fontFamily: K.mono,
          fontSize: 44,
          fontWeight: 700,
          color: K.ink,
          background: K.surfaceCool,
          border: `2px solid ${K.lineStrong}`,
          borderRadius: 18,
          outline: "none",
          letterSpacing: -1,
        }}
      />
      <div
        style={{
          fontFamily: K.display,
          fontSize: 10.5,
          fontWeight: 800,
          color: K.ink3,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 80,
        background: "rgba(8,0,31,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "overlayIn 0.3s ease both",
        fontFamily: K.body,
      }}
    >
      <div
        style={{
          width: 460,
          background: "#fff",
          borderRadius: 32,
          padding: 28,
          boxShadow: "0 30px 80px rgba(15,0,60,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          animation: "mascotIn 0.45s cubic-bezier(0.2,0.9,0.3,1.15) both",
          color: K.ink,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "linear-gradient(135deg, #FFD56B 0%, #FF9A2E 100%)",
            boxShadow: "0 5px 0 rgba(198,101,38,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="34" height="34" viewBox="0 0 44 44">
            <path
              d="M14 20 Q14 10 22 10 Q30 10 30 20"
              stroke="#fff"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <rect x="10" y="20" width="24" height="18" rx="3" fill="#fff" />
            <circle cx="22" cy="28" r="2.5" fill="#FF9A2E" />
          </svg>
        </div>
        <div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 11,
              fontWeight: 800,
              color: "#FF9A2E",
              letterSpacing: 1.4,
              textTransform: "uppercase",
            }}
          >
            ● Cadenas · nouveau code
          </div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 26,
              fontWeight: 800,
              color: K.ink,
              letterSpacing: -0.8,
              marginTop: 4,
            }}
          >
            Changer le code
          </div>
          <div
            style={{
              fontSize: 13,
              color: K.ink3,
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            3 nombres entre 00 et 39. Ce nouveau code remplace le précédent dans
            la base.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {field(a, setA, "Droite")}
          <span
            style={{
              fontFamily: K.display,
              fontSize: 32,
              color: K.ink3,
              fontWeight: 800,
            }}
          >
            ·
          </span>
          {field(b, setB, "Gauche")}
          <span
            style={{
              fontFamily: K.display,
              fontSize: 32,
              color: K.ink3,
              fontWeight: 800,
            }}
          >
            ·
          </span>
          {field(c, setC, "Droite")}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn kind="ghost" size="md" onClick={onCancel} style={{ flex: 1 }}>
            Annuler
          </Btn>
          <Btn
            kind="warm"
            size="md"
            disabled={!valid}
            onClick={save}
            style={{ flex: 2 }}
            icon={Icons.check({ size: 18, stroke: "#fff", strokeWidth: 2.5 })}
          >
            Enregistrer le code
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Casier delivery cheer ─────────────────────────────────
function CasierCheer({
  student,
  locker,
}: {
  student: Student;
  locker: Locker;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 70,
        background: "rgba(8,0,31,0.72)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "overlayIn 0.3s ease both",
        flexDirection: "column",
        gap: 22,
        fontFamily: K.body,
        padding: 40,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 280,
          height: 260,
          animation: "mascotIn 0.7s cubic-bezier(0.2,0.9,0.3,1.15) both",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, oklch(0.85 0.12 160 / 0.65), oklch(0.92 0.06 160 / 0.30) 55%, transparent 75%)",
            animation: "haloPulse 2.4s ease-in-out infinite",
          }}
        />
        {[
          { x: 28, y: 48, d: 0.3, sm: false },
          { x: 228, y: 36, d: 0.55, sm: true },
          { x: 244, y: 150, d: 0.45, sm: false },
          { x: 10, y: 166, d: 0.7, sm: true },
          { x: 42, y: 224, d: 0.6, sm: false },
          { x: 224, y: 224, d: 0.8, sm: true },
        ].map((s, i) => (
          <svg
            key={i}
            width={s.sm ? 14 : 22}
            height={s.sm ? 14 : 22}
            viewBox="0 0 24 24"
            style={{
              position: "absolute",
              left: s.x,
              top: s.y,
              animation: `sparkle 1.6s ease-in-out ${s.d}s infinite`,
              opacity: 0,
            }}
          >
            <path
              d="M12 0 L13.8 9 L23 12 L13.8 14.5 L12 24 L10.2 14.5 L1 12 L10.2 9 Z"
              fill="#FFD23F"
            />
          </svg>
        ))}

        <svg
          viewBox="0 0 280 260"
          width="280"
          height="260"
          style={{ position: "absolute", inset: 0 }}
        >
          <defs>
            <linearGradient id="lockGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6AE3A8" />
              <stop offset="100%" stopColor="#2BB070" />
            </linearGradient>
            <radialGradient id="handGrad2" cx="0.35" cy="0.35" r="0.85">
              <stop offset="0%" stopColor="#FFE4C7" />
              <stop offset="100%" stopColor="#E8B07A" />
            </radialGradient>
          </defs>
          <ellipse cx="140" cy="248" rx="78" ry="7" fill="rgba(0,0,0,0.30)" />
          <path
            d="M86 116 Q86 56 140 56 Q194 56 194 116 L194 146"
            stroke="#A8A39A"
            strokeWidth="24"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M86 116 Q86 56 140 56 Q194 56 194 116 L194 146"
            stroke="#D6D2C9"
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />
          <rect
            x="62"
            y="108"
            width="156"
            height="134"
            rx="22"
            fill="url(#lockGrad)"
            stroke="#1F8A47"
            strokeWidth="5"
          />
          <rect x="70" y="118" width="140" height="14" rx="7" fill="#6AE3A8" opacity="0.65" />
          <g style={{ animation: "eyeBlink 4s ease-in-out infinite" }}>
            <path
              d="M 100 154 Q 108 144 118 154"
              stroke="#0F3D22"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 162 154 Q 170 144 180 154"
              stroke="#0F3D22"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <circle cx="86" cy="180" r="7" fill="#FF8FB3" opacity="0.7" />
          <circle cx="194" cy="180" r="7" fill="#FF8FB3" opacity="0.7" />
          <path
            d="M 112 186 Q 140 210 168 186"
            stroke="#0F3D22"
            strokeWidth="5.5"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="140" cy="224" r="6" fill="#1F8A47" />
          <rect x="137" y="223" width="6" height="12" rx="2" fill="#1F8A47" />
          <g
            style={{
              transformOrigin: "218px 178px",
              animation: "thumbWiggle 1.4s ease-in-out infinite",
            }}
          >
            <path
              d="M 218 178 Q 240 152 246 116"
              stroke="url(#lockGrad)"
              strokeWidth="22"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="248" cy="104" r="20" fill="url(#handGrad2)" />
            <path
              d="M 244 90 Q 240 70 252 64 Q 264 66 261 88 Z"
              fill="url(#handGrad2)"
              stroke="rgba(120,70,40,0.30)"
              strokeWidth="1"
            />
          </g>
          <g
            style={{
              transformOrigin: "74px 96px",
              animation:
                "badgePop 0.6s cubic-bezier(0.2,0.9,0.3,1.4) 0.45s both",
            }}
          >
            <circle cx="74" cy="96" r="22" fill="#FFD23F" />
            <circle
              cx="74"
              cy="96"
              r="22"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
              opacity="0.7"
            />
            <path
              d="M 64 96 l 7 7 l 14 -14"
              stroke="#1B0F45"
              strokeWidth="4.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>

      <div
        style={{
          textAlign: "center",
          color: "#fff",
          animation: "captionIn 0.5s cubic-bezier(0.2,0.8,0.2,1) 0.35s both",
        }}
      >
        <div
          style={{
            fontFamily: K.display,
            fontSize: 11,
            fontWeight: 800,
            color: "#FFD23F",
            letterSpacing: 1.6,
            textTransform: "uppercase",
          }}
        >
          ● Casier · Remis
        </div>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: -1.4,
            lineHeight: 1.05,
            marginTop: 6,
          }}
        >
          Casier remis&nbsp;!
        </div>
        <div
          style={{
            fontSize: 16,
            marginTop: 10,
            color: "rgba(255,255,255,0.85)",
            fontWeight: 600,
            maxWidth: 460,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <strong style={{ color: "#FFD23F", fontFamily: K.mono }}>
            {locker.number}
          </strong>{" "}
          attribué à{" "}
          <strong style={{ color: "#fff" }}>
            {student.first} {student.last}
          </strong>
          . Tout est enregistré dans la base.
        </div>
      </div>
    </div>
  );
}
