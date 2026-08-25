"use client";
// Poste réception — annonce un élève au poste de remise des portables.
// Tableau de bord : caméra + saisie + liste complète des élèves avec statut.
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Pill, Icons, Spinner } from "@/components/ui";
import BarcodeScanner from "@/components/BarcodeScanner";
import { APPOINTMENT_SLOTS } from "@/lib/appointment-slots";

type Status = "PENDING" | "EN_ROUTE" | "DELIVERED";
type StudentRow = {
  studentNumber: string;
  firstName: string;
  lastName: string;
  group: string;
  level: string;
  status: Status;
  announcedAt: string | null;
  /** Qui a mis l'élève en route (nom figé au moment de l'annonce). */
  announcedByName: string | null;
  /** Poste portable qui l'a pris en charge, si la prise est encore active. */
  claimedByName: string | null;
  /** Créneau du rendez-vous, ex. « 8h30 ». null = sans rendez-vous. */
  appointmentTime: string | null;
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
    | { kind: "ok"; name: string; number: string }
    | { kind: "err"; message: string }
    | null
  >(null);
  const [students, setStudents] = React.useState<StudentRow[]>([]);
  const [camError, setCamError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [filterGroup, setFilterGroup] = React.useState<string>("");
  const [filterStatus, setFilterStatus] = React.useState<"" | Status>("");
  // "" = tous les élèves (comportement d'origine, aucun filtre d'heure).
  const [filterSlot, setFilterSlot] = React.useState<string>("");
  // Confirmation avant d'appliquer : marquer « en route » ou annuler l'annonce.
  // null = aucune boîte de dialogue ouverte.
  const [confirming, setConfirming] = React.useState<
    { action: "announce" | "cancel"; student: StudentRow } | null
  >(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [lastSync, setLastSync] = React.useState<Date | null>(null);
  const [offline, setOffline] = React.useState(false);

  // Poll de la liste complète (5 s)
  const refresh = React.useCallback(async () => {
    try {
      const r = await fetch("/api/reception/students");
      if (r.ok) {
        setStudents(await r.json());
        setLastSync(new Date());
        setOffline(false);
      }
    } catch {
      setOffline(true);
    }
  }, []);
  React.useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const announce = async (rawCode?: string) => {
    const v = (rawCode ?? code).trim();
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
      setFlash({
        kind: "ok",
        name: `${j.student.firstName} ${j.student.lastName}`,
        number: j.student.studentNumber,
      });
      setCode("");
      refresh();
      setTimeout(() => inputRef.current?.focus(), 100);
      setTimeout(() => setFlash(null), 4000);
    } catch (e) {
      setFlash({ kind: "err", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // Annule une annonce : l'élève repasse « à remettre ». Le serveur refuse si
  // un poste portable l'a déjà pris en charge — on affiche alors son message.
  const cancelAnnounce = async (student: StudentRow) => {
    if (busy) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch("/api/reception/announce", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentNumber: student.studentNumber }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Erreur");
      refresh();
    } catch (e) {
      setFlash({ kind: "err", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // Applique ce que la boîte de dialogue vient de confirmer.
  const runConfirmed = () => {
    if (!confirming) return;
    const { action, student } = confirming;
    setConfirming(null);
    if (action === "announce") announce(student.studentNumber);
    else cancelAnnounce(student);
  };

  // Groupes disponibles + stats
  const groups = React.useMemo(
    () => Array.from(new Set(students.map((s) => s.group))).sort(),
    [students],
  );
  // Combien d'élèves par créneau — affiché dans le sélecteur pour savoir
  // d'un coup d'œil ce qui reste à faire dans l'heure en cours.
  const slotCounts = React.useMemo(() => {
    const c: Record<string, number> = {};
    students.forEach((s) => {
      if (s.appointmentTime) c[s.appointmentTime] = (c[s.appointmentTime] ?? 0) + 1;
    });
    return c;
  }, [students]);

  const stats = React.useMemo(() => {
    const c = { PENDING: 0, EN_ROUTE: 0, DELIVERED: 0 };
    students.forEach((s) => c[s.status]++);
    return c;
  }, [students]);

  // Liste filtrée
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (filterGroup && s.group !== filterGroup) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterSlot && s.appointmentTime !== filterSlot) return false;
      if (q) {
        const hay =
          `${s.firstName} ${s.lastName} ${s.studentNumber} ${s.group}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [students, search, filterGroup, filterStatus, filterSlot]);

  return (
    <div
      style={{
        height: "100%",
        background: K.bgApp,
        color: K.ink,
        animation: "screenIn 0.35s ease both",
        fontFamily: K.body,
        padding: 24,
        overflow: "auto",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 11,
                fontWeight: 800,
                color: K.violet,
                letterSpacing: 1.6,
                textTransform: "uppercase",
              }}
            >
              ● RemiseCMR · Réception · {operatorName}
            </div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: -1,
                marginTop: 4,
              }}
            >
              Annoncer un élève au poste portable
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                marginTop: 6,
                fontFamily: K.mono,
                fontSize: 11.5,
                fontWeight: 700,
                color: offline ? "#B2245A" : K.ink3,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: offline ? "#FF4D5E" : "#36C26B",
                  boxShadow: `0 0 8px ${offline ? "#FF4D5E" : "#36C26B"}`,
                }}
              />
              {offline
                ? "Hors ligne — reconnexion en cours…"
                : lastSync
                  ? `Connecté · mis à jour à ${lastSync.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                  : "Connexion…"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn
              kind="light"
              size="md"
              icon={Icons.download({ size: 18 })}
              onClick={() => window.open("/api/reception/absents", "_blank")}
            >
              Absents (Excel)
            </Btn>
            <Btn
              kind="ghostDark"
              size="md"
              icon={Icons.back({ size: 20, stroke: "#fff" })}
              onClick={() => router.push("/")}
            >
              Retour
            </Btn>
          </div>
        </div>

        {/* Caméra + saisie côte à côte */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              position: "relative",
              borderRadius: 20,
              overflow: "hidden",
              background: "linear-gradient(180deg, #2D0F75 0%, #1B0945 100%)",
              height: 260,
              boxShadow: "0 18px 40px rgba(15,0,60,0.30)",
            }}
          >
            <div style={{ position: "absolute", inset: 0 }}>
              {camError ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 13,
                    padding: 24,
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                >
                  Caméra indisponible — utilisez le champ de saisie.
                </div>
              ) : (
                <BarcodeScanner
                  onDetected={(c) => announce(c)}
                  onError={(m) => setCamError(m)}
                />
              )}
            </div>
            <div
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                fontFamily: K.display,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: camError ? "#FF4D5E" : "#FFD23F",
                  boxShadow: `0 0 10px ${camError ? "#FF4D5E" : "#FFD23F"}`,
                  animation: "pulse 1.4s ease-in-out infinite",
                }}
              />
              {camError ? "Caméra indisponible" : "Caméra active"}
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              color: K.ink,
              borderRadius: 20,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxShadow: "0 18px 40px rgba(15,0,60,0.30)",
            }}
          >
            <div
              style={{
                fontFamily: K.display,
                fontSize: 11,
                fontWeight: 800,
                color: K.ink3,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Ou saisir manuellement
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: K.surfaceCool,
                borderRadius: 14,
                border: `2px solid ${K.lineStrong}`,
              }}
            >
              {Icons.scan({ size: 22, stroke: K.ink2 })}
              <input
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") announce();
                }}
                placeholder="N° d'élève…"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: K.display,
                  fontSize: 20,
                  fontWeight: 700,
                  color: K.ink,
                }}
              />
              {busy && <Spinner />}
            </div>
            <Btn
              kind="success"
              size="lg"
              full
              disabled={busy || !code.trim()}
              icon={Icons.check({ size: 22, stroke: "#fff" })}
              onClick={() => announce()}
            >
              Annoncer
            </Btn>
            {flash && flash.kind === "ok" && (
              <div
                style={{
                  background: K.greenSoft,
                  color: "#1F8A47",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                ✓ {flash.name} ({flash.number}) annoncé
              </div>
            )}
            {flash && flash.kind === "err" && (
              <div
                style={{
                  background: K.pinkSoft,
                  color: "#B2245A",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                ✗ {flash.message}
              </div>
            )}
          </div>
        </div>

        {/* Statistiques */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <StatChip label="À remettre" count={stats.PENDING} color="#5B2BC9" />
          <StatChip label="En route" count={stats.EN_ROUTE} color="#FF8C42" />
          <StatChip label="Remis" count={stats.DELIVERED} color="#36C26B" />
        </div>

        {/* Liste + filtres */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 20,
            padding: 16,
            boxShadow: "0 14px 30px rgba(15,0,60,0.25)",
          }}
        >
          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: K.surfaceCool,
              borderRadius: 12,
              border: `1px solid ${K.line}`,
              marginBottom: 12,
            }}
          >
            {Icons.search({ size: 18, stroke: K.ink3 })}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, n° d'élève ou groupe…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: K.display,
                fontSize: 14,
                fontWeight: 700,
                color: K.ink,
              }}
            />
          </div>

          {/* Sélecteur de créneau de rendez-vous */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: K.surfaceCool,
              borderRadius: 12,
              border: `1px solid ${K.line}`,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontFamily: K.display,
                fontSize: 13,
                fontWeight: 800,
                color: K.ink3,
                whiteSpace: "nowrap",
              }}
            >
              Rendez-vous
            </span>
            <select
              value={filterSlot}
              onChange={(e) => setFilterSlot(e.target.value)}
              aria-label="Filtrer par créneau de rendez-vous"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: K.display,
                fontSize: 14,
                fontWeight: 700,
                color: K.ink,
                cursor: "pointer",
              }}
            >
              <option value="">Toutes les heures</option>
              {APPOINTMENT_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot} ({slotCounts[slot] ?? 0})
                </option>
              ))}
            </select>
            {filterSlot && (
              <button
                type="button"
                onClick={() => setFilterSlot("")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: K.display,
                  fontSize: 12,
                  fontWeight: 800,
                  color: K.ink3,
                  textDecoration: "underline",
                }}
              >
                Effacer
              </button>
            )}
          </div>

          {/* Status filters */}
          <div
            style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}
          >
            <FilterChip
              label="Tous"
              active={filterStatus === ""}
              onClick={() => setFilterStatus("")}
            />
            <FilterChip
              label="À remettre"
              active={filterStatus === "PENDING"}
              onClick={() => setFilterStatus("PENDING")}
              color="#5B2BC9"
            />
            <FilterChip
              label="En route"
              active={filterStatus === "EN_ROUTE"}
              onClick={() => setFilterStatus("EN_ROUTE")}
              color="#FF8C42"
            />
            <FilterChip
              label="Remis"
              active={filterStatus === "DELIVERED"}
              onClick={() => setFilterStatus("DELIVERED")}
              color="#36C26B"
            />
          </div>

          {/* Group filters */}
          {groups.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <FilterChip
                label="Tous groupes"
                active={filterGroup === ""}
                onClick={() => setFilterGroup("")}
              />
              {groups.map((g) => (
                <FilterChip
                  key={g}
                  label={g}
                  active={filterGroup === g}
                  onClick={() => setFilterGroup(g)}
                />
              ))}
            </div>
          )}

          {/* List */}
          <div style={{ fontSize: 12, color: K.ink3, fontWeight: 700, marginBottom: 6 }}>
            {filtered.length} élève(s)
          </div>
          {filtered.length === 0 ? (
            <div
              style={{
                color: K.ink3,
                fontWeight: 600,
                fontSize: 13,
                padding: 24,
                textAlign: "center",
              }}
            >
              Aucun élève ne correspond.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxHeight: 480,
                overflowY: "auto",
              }}
            >
              {filtered.map((s) => (
                <StudentRowView
                  key={s.studentNumber}
                  s={s}
                  busy={busy}
                  onAnnounce={() =>
                    setConfirming({ action: "announce", student: s })
                  }
                  onCancel={() => setConfirming({ action: "cancel", student: s })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation — rien n'est appliqué tant que « Oui » n'est pas cliqué. */}
      {confirming && (
        <div
          onClick={() => setConfirming(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,0,60,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 50,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 24,
              maxWidth: 380,
              width: "100%",
              boxShadow: "0 24px 60px rgba(15,0,60,0.35)",
            }}
          >
            <div
              style={{
                fontFamily: K.display,
                fontSize: 17,
                fontWeight: 800,
                color: K.ink,
                lineHeight: 1.35,
              }}
            >
              {confirming.action === "announce"
                ? `Envoyer ${confirming.student.firstName} ${confirming.student.lastName} en route ?`
                : `Annuler l'annonce de ${confirming.student.firstName} ${confirming.student.lastName} ?`}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: K.ink3,
                marginTop: 8,
              }}
            >
              {confirming.action === "announce"
                ? "Le poste des portables le verra arriver."
                : confirming.student.claimedByName
                  ? `${confirming.student.claimedByName} s'en occupe déjà au poste des portables — l'annulation sera refusée.`
                  : `Annoncé par ${confirming.student.announcedByName ?? "la réception"}. L'élève repassera « à remettre ».`}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <Btn
                kind="ghost"
                size="sm"
                full
                onClick={() => setConfirming(null)}
              >
                Non
              </Btn>
              <Btn
                kind={confirming.action === "announce" ? "primary" : "danger"}
                size="sm"
                full
                disabled={busy}
                onClick={runConfirmed}
              >
                Oui
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        color: K.ink,
        borderRadius: 16,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 8px 18px rgba(15,0,60,0.20)",
      }}
    >
      <div
        style={{
          width: 8,
          height: 36,
          borderRadius: 4,
          background: color,
        }}
      />
      <div>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 10,
            fontWeight: 800,
            color: K.ink3,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 22,
            fontWeight: 800,
            color: K.ink,
            letterSpacing: -0.5,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {count}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        background: active ? color || K.violetDeep : K.surfaceCool,
        color: active ? "#fff" : K.ink2,
        borderRadius: 999,
        padding: "6px 14px",
        fontFamily: K.display,
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: 0.6,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function StudentRowView({
  s,
  busy,
  onAnnounce,
  onCancel,
}: {
  s: StudentRow;
  busy: boolean;
  onAnnounce: () => void;
  onCancel: () => void;
}) {
  // « En route » = carton sur roulettes (en chemin) ; « Remis » = carton scellé
  // (la remise est close). « À remettre » garde son pastille sans icône.
  const tone =
    s.status === "DELIVERED"
      ? {
          bg: "#DCF5E5",
          color: "#1F8A47",
          label: "Remis",
          icon: Icons.boxClosed,
        }
      : s.status === "EN_ROUTE"
        ? {
            bg: "#FFE9D9",
            color: "#C66526",
            label: "En route",
            icon: Icons.boxRolling,
          }
        : {
            bg: K.surfaceCool,
            color: K.ink3,
            label: "À remettre",
            icon: null,
          };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 10,
        background: s.status === "EN_ROUTE" ? "#FFF4E8" : "transparent",
        border: `1px solid ${K.line}`,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: K.violet,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: K.display,
          fontWeight: 800,
          fontSize: 11,
          flexShrink: 0,
        }}
      >
        Sec {s.level}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: K.display,
            fontSize: 14,
            fontWeight: 800,
            color: K.ink,
          }}
        >
          {s.firstName} {s.lastName}
        </div>
        <div
          style={{ fontSize: 11.5, color: K.ink3, fontWeight: 700 }}
        >
          <span style={{ fontFamily: K.mono }}>{s.studentNumber}</span> ·{" "}
          {s.group}
          {s.announcedAt && s.status === "EN_ROUTE" && (
            <>
              {" · "}
              <span style={{ fontFamily: K.mono }}>
                {new Date(s.announcedAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {s.announcedByName && <> · par {s.announcedByName}</>}
            </>
          )}
          {s.status === "EN_ROUTE" && s.claimedByName && (
            <>
              {" · "}
              <span style={{ color: "#C66526", fontWeight: 800 }}>
                en cours avec {s.claimedByName}
              </span>
            </>
          )}
        </div>
      </div>
      <div
        style={{
          background: tone.bg,
          color: tone.color,
          borderRadius: 999,
          padding: "5px 12px",
          fontFamily: K.display,
          fontWeight: 800,
          fontSize: 10.5,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {tone.icon && tone.icon({ size: 14, stroke: tone.color })}
        {tone.label}
      </div>
      {s.status === "PENDING" && (
        <Btn
          kind="primary"
          size="sm"
          disabled={busy}
          onClick={onAnnounce}
        >
          Annoncer
        </Btn>
      )}
      {s.status === "EN_ROUTE" && (
        <Btn kind="ghost" size="sm" disabled={busy} onClick={onCancel}>
          Annuler
        </Btn>
      )}
    </div>
  );
}
