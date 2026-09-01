"use client";
// Attribution du casier — l'opérateur choisit un casier du catalogue.
// Binôme optionnel. Pas de signature, pas de PDF.
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Pill, KV, Avatar, TileIcon, Icons, Spinner } from "@/components/ui";
import { Alert } from "@/components/screens/StudentScreen";
import type { ClientStudent } from "@/lib/mappers";
import {
  EditPreviewPanel,
  EditRow,
  LevelHint,
  SectionTitle,
  type EditPreview,
} from "@/components/CasierEditFields";

type SearchResult = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  group: string;
  level: string;
};

type LockerOpt = {
  number: string;
  serialNumber: string;
  combinationCode?: string; // absent du catalogue ; présent après attribution
};

type Props = {
  student: ClientStudent;
  mode: "assign" | "done";
  assignedLocker: LockerOpt | null;
  binome: ClientStudent | null;
  availableLockers: LockerOpt[];
  operatorName: string;
  /** Petit casier de l'élève — hors DTO client par défaut (voir mappers.ts). */
  petitCasier: string;
};

export default function CasierScreen({
  student,
  mode,
  assignedLocker,
  binome,
  availableLockers,
  operatorName,
  petitCasier,
}: Props) {
  const router = useRouter();
  const isDone = mode === "done";
  const [correcting, setCorrecting] = React.useState(false);
  // Sélection active : nouvelle attribution OU correction d'un casier remis.
  const pickMode = !isDone || correcting;

  const [picked, setPicked] = React.useState<LockerOpt | null>(assignedLocker);
  const [lockerQuery, setLockerQuery] = React.useState("");
  const [selectedBinome, setSelectedBinome] = React.useState<
    ClientStudent | SearchResult | null
  >(binome);
  const [busy, setBusy] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState("");
  const [savingBinome, setSavingBinome] = React.useState(false);
  const [binomeFlash, setBinomeFlash] = React.useState("");

  // Binôme modifié sans changer de casier ? (mode « done », hors correction)
  const binomeDirty =
    isDone &&
    !correcting &&
    (selectedBinome?.studentNumber ?? null) !== (binome?.studentNumber ?? null);

  const saveBinome = async () => {
    if (savingBinome || !binomeDirty) return;
    setSavingBinome(true);
    setBinomeFlash("");
    try {
      const res = await fetch("/api/casier/update-binome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: student.studentNumber,
          binomeStudentNumber: selectedBinome?.studentNumber ?? "",
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Échec de la mise à jour.");
      setBinomeFlash("✓ Binôme enregistré.");
      router.refresh();
      setTimeout(() => setBinomeFlash(""), 4000);
    } catch (e) {
      setBinomeFlash("✗ " + (e as Error).message);
    } finally {
      setSavingBinome(false);
    }
  };

  // filtre des casiers disponibles
  const lockerMatches = React.useMemo(() => {
    const q = lockerQuery.trim().toLowerCase();
    if (!q) return availableLockers.slice(0, 80);
    return availableLockers
      .filter(
        (l) =>
          l.number.toLowerCase().includes(q) ||
          (l.serialNumber || "").toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [availableLockers, lockerQuery]);

  const confirm = async () => {
    if (busy || !picked) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        correcting ? "/api/casier/reassign" : "/api/casier/confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentNumber: student.studentNumber,
            lockerNumber: picked.number,
            binomeStudentNumber: selectedBinome?.studentNumber ?? "",
          }),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Échec de la remise.");
      // La combinaison n'arrive qu'ici, dans la réponse serveur (CN-002).
      if (j?.combinationCode) {
        setPicked((p) => (p ? { ...p, combinationCode: j.combinationCode } : p));
      }
      setSuccess(true);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: K.bgApp,
        color: K.ink,
        fontFamily: K.body,
        position: "relative",
        animation: "screenIn 0.35s ease both",
      }}
    >
      {/* Gauche : identité + binôme */}
      <div
        style={{
          flex: 1,
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflow: "auto",
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => router.push("/scan?mode=casier")}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              border: "none",
              background: "#1E3A5F",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 0 #0F2540, 0 10px 22px rgba(30,58,95,0.25)",
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
                color: "#1F8A47",
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
                marginTop: 2,
                color: K.ink,
              }}
            >
              {correcting
                ? "Changer le casier"
                : isDone
                  ? "Casier déjà remis"
                  : "Attribuer le casier"}
            </div>
          </div>
        </div>

        {!student.receivesLocker && (
          <Alert
            tone="red"
            title="Cet élève ne reçoit pas de casier"
            text="Selon le CSV importé, cet élève n'est pas sur la liste des casiers."
          />
        )}
        {isDone && !correcting && (
          <Alert
            tone="amber"
            title="Casier déjà attribué"
            text="Cet élève a déjà un casier enregistré dans la base."
          />
        )}
        {correcting && (
          <Alert
            tone="amber"
            title="Correction du casier"
            text="Choisissez le nouveau casier. L'ancien sera libéré et redeviendra disponible."
          />
        )}

        {/* Identité */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 28,
            padding: 22,
            boxShadow: K.shadowCard,
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
                {student.group} · Secondaire {student.level}
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
                {student.firstName} {student.lastName}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <Pill tone="primary">{student.studentNumber}</Pill>
                {isDone && <Pill tone="success">Casier remis</Pill>}
              </div>
            </div>
            {/* Correction de fiche — volontairement « ghost » : l'action
                principale de l'écran reste la remise du casier. */}
            <Btn
              kind="ghost"
              size="md"
              icon={Icons.pen({ size: 18 })}
              onClick={() => setEditing(true)}
            >
              Modifier la fiche
            </Btn>
          </div>

          <KV
            label="Numéro d'élève"
            value={student.studentNumber}
            mono
            icon={<TileIcon kind="badge" />}
          />
          <KV
            label="Groupe / Niveau"
            value={`${student.group} · Secondaire ${student.level}`}
            icon={<TileIcon kind="backpack" />}
          />
          <KV
            label="Courriel"
            value={student.email || "—"}
            icon={<TileIcon kind="family" />}
          />
        </div>

        {/* Binôme */}
        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 28,
            padding: 22,
            boxShadow: K.shadowCard,
          }}
        >
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
            ● Binôme (optionnel)
          </div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 20,
              fontWeight: 800,
              color: K.ink,
              marginTop: 2,
              marginBottom: 12,
            }}
          >
            {selectedBinome ? "2ᵉ élève du casier" : "Aucun binôme"}
          </div>

          <BinomePicker
            selected={selectedBinome}
            onSelect={setSelectedBinome}
            excludeId={student.id}
          />

          {/* Enregistrer le binôme — mode « done » uniquement */}
          {(binomeDirty || binomeFlash) && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: `1px solid ${K.line}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {binomeFlash && (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: binomeFlash.startsWith("✓") ? "#1F8A47" : "#B2245A",
                  }}
                >
                  {binomeFlash}
                </span>
              )}
              {binomeDirty && (
                <>
                  <span
                    style={{
                      fontSize: 12,
                      color: K.ink3,
                      fontWeight: 700,
                      flex: 1,
                      minWidth: 140,
                    }}
                  >
                    Changement non enregistré
                  </span>
                  <Btn
                    kind="success"
                    size="md"
                    disabled={savingBinome}
                    icon={Icons.check({ size: 18, stroke: "#fff" })}
                    onClick={saveBinome}
                  >
                    {savingBinome
                      ? "Enregistrement…"
                      : "Enregistrer le binôme"}
                  </Btn>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />
      </div>

      {/* Droite : sélection / affichage du casier */}
      <div
        style={{
          width: 480,
          padding: "24px 26px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflow: "auto",
        }}
      >
        {pickMode && !picked ? (
          /* ─── Sélecteur de casier ─────────────────────────── */
          <div
            style={{
              background: "#fff",
              color: K.ink,
              borderRadius: 28,
              padding: 22,
              boxShadow: K.shadowCard,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#2BB070",
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                }}
              >
                ● Étape 02 · Choisir le casier
              </div>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 22,
                  fontWeight: 800,
                  color: K.ink,
                  marginTop: 2,
                }}
              >
                Sélectionnez un casier
              </div>
            </div>

            {availableLockers.length === 0 ? (
              <Alert
                tone="red"
                title="Aucun casier disponible"
                text="Importez le catalogue des casiers depuis Admin › Importer les listes."
              />
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: K.surfaceCool,
                    borderRadius: 14,
                    padding: "12px 14px",
                    border: `2px solid ${K.lineStrong}`,
                  }}
                >
                  {Icons.search({ size: 18, stroke: K.ink3 })}
                  <input
                    value={lockerQuery}
                    onChange={(e) => setLockerQuery(e.target.value)}
                    placeholder="N° de casier ou n° de série…"
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontFamily: K.display,
                      fontSize: 15,
                      fontWeight: 700,
                      color: K.ink,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: K.ink3,
                    fontWeight: 700,
                  }}
                >
                  {availableLockers.length} casier(s) disponible(s)
                </div>
                <div
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${K.line}`,
                    maxHeight: 420,
                    overflow: "auto",
                  }}
                >
                  {lockerMatches.map((l) => (
                    <div
                      key={l.number}
                      onClick={() => setPicked(l)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        cursor: "pointer",
                        borderBottom: `1px solid ${K.line}`,
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          background:
                            "linear-gradient(135deg, #4ED5D5, #1AA0A0)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: K.display,
                          fontWeight: 800,
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      >
                        {l.number}
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
                          Casier {l.number}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: K.ink3,
                            fontWeight: 700,
                            fontFamily: K.mono,
                          }}
                        >
                          Série {l.serialNumber || "—"}
                        </div>
                      </div>
                      {Icons.chev({ size: 18, stroke: K.ink4 })}
                    </div>
                  ))}
                  {lockerMatches.length === 0 && (
                    <div
                      style={{
                        padding: 20,
                        textAlign: "center",
                        color: K.ink3,
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      Aucun casier ne correspond.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          /* ─── Casier choisi / déjà attribué ───────────────── */
          <>
            <div
              style={{
                background: "linear-gradient(135deg, #4ED5D5 0%, #1AA0A0 100%)",
                borderRadius: 28,
                padding: 24,
                color: "#fff",
                boxShadow:
                  "0 6px 0 rgba(13,80,80,0.45), 0 24px 60px rgba(26,160,160,0.35)",
              }}
            >
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
                🔒 Casier {pickMode ? "sélectionné" : "attribué"}
              </div>
              <div
                style={{
                  fontFamily: K.display,
                  fontSize: 56,
                  fontWeight: 800,
                  letterSpacing: -2,
                  lineHeight: 1,
                  marginTop: 6,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {picked?.number}
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                color: K.ink,
                borderRadius: 24,
                padding: 20,
                boxShadow: K.shadowCard,
              }}
            >
              <KV
                label="N° de série du cadenas"
                value={picked?.serialNumber || "—"}
                mono
                icon={<TileIcon kind="locker" />}
              />
              <KV
                label="Code du cadenas"
                value={picked?.combinationCode || "Révélé à la confirmation"}
                mono
                icon={<TileIcon kind="sparkle" />}
              />
            </div>

            {pickMode && (
              <button
                onClick={() => {
                  setPicked(null);
                  setLockerQuery("");
                }}
                style={{
                  border: "none",
                  background: "#1E3A5F",
                  color: "#fff",
                  borderRadius: 14,
                  padding: "14px 18px",
                  fontFamily: K.display,
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: "0 4px 0 #0F2540, 0 10px 22px rgba(30,58,95,0.25)",
                }}
              >
                ↻ Choisir un autre casier
              </button>
            )}

            {error && (
              <div
                style={{
                  background: "#fff",
                  color: "#B2245A",
                  borderRadius: 14,
                  padding: "12px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ flex: 1 }} />

            <div
              style={{
                background: "#fff",
                color: K.ink,
                borderRadius: 24,
                padding: 20,
                boxShadow: K.shadowCard,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 13, color: K.ink3, fontWeight: 700 }}>
                Résumé : casier{" "}
                <strong style={{ color: K.ink }}>{picked?.number}</strong> pour{" "}
                <strong style={{ color: K.ink }}>
                  {student.firstName} {student.lastName}
                </strong>
                {selectedBinome
                  ? ` + binôme ${selectedBinome.firstName} ${selectedBinome.lastName}`
                  : " — sans binôme"}
                .
              </div>

              {isDone && !correcting ? (
                <>
                  <Btn
                    kind="warm"
                    size="lg"
                    full
                    icon={Icons.refresh({ size: 20, stroke: "#fff" })}
                    onClick={() => {
                      setCorrecting(true);
                      setPicked(null);
                      setLockerQuery("");
                      setError("");
                    }}
                  >
                    Changer le casier (corriger)
                  </Btn>
                  <Btn
                    kind="ghost"
                    size="lg"
                    full
                    icon={Icons.back({ size: 22 })}
                    onClick={() => router.push("/scan?mode=casier")}
                  >
                    Retour au scanner
                  </Btn>
                </>
              ) : (
                <Btn
                  kind="success"
                  size="lg"
                  full
                  disabled={busy}
                  icon={
                    busy ? (
                      <Spinner />
                    ) : (
                      Icons.check({ size: 22, stroke: "#fff" })
                    )
                  }
                  onClick={confirm}
                >
                  {busy
                    ? "Enregistrement…"
                    : correcting
                      ? "Confirmer le nouveau casier"
                      : "Confirmer la remise du casier"}
                </Btn>
              )}
            </div>
          </>
        )}
      </div>

      {editing && (
        <StudentEditModal
          student={student}
          lockerNumber={assignedLocker?.number ?? ""}
          petitCasier={petitCasier}
          binome={binome}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      )}

      {success && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 70,
            background: "rgba(8,0,31,0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            animation: "overlayIn 0.3s ease both",
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 36,
              background: "linear-gradient(135deg, #6AE3A8, #2BB070)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "mascotIn 0.6s cubic-bezier(0.2,0.9,0.3,1.15) both",
              boxShadow: "0 8px 0 #1F8A47",
            }}
          >
            {Icons.check({ size: 64, stroke: "#fff", strokeWidth: 3 })}
          </div>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 44,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: -1.2,
            }}
          >
            Casier remis !
          </div>
          <div
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.85)",
              fontWeight: 600,
              textAlign: "center",
              maxWidth: 420,
            }}
          >
            <strong style={{ color: "#FFD23F", fontFamily: K.mono }}>
              {picked?.number}
            </strong>{" "}
            attribué à {student.firstName} {student.lastName}
            {selectedBinome
              ? ` et ${selectedBinome.firstName} ${selectedBinome.lastName}`
              : ""}
            .
          </div>
          {picked?.combinationCode && (
            <div
              style={{
                marginTop: 4,
                padding: "16px 28px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.12)",
                border: "2px dashed rgba(255,255,255,0.35)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Code du cadenas — à communiquer à l'élève
              </div>
              <div
                style={{
                  fontFamily: K.mono,
                  fontSize: 40,
                  fontWeight: 800,
                  color: "#FFD23F",
                  letterSpacing: 2,
                  marginTop: 6,
                }}
              >
                {picked.combinationCode}
              </div>
            </div>
          )}
          <Btn
            kind="light"
            size="lg"
            icon={Icons.check({ size: 22 })}
            onClick={() => {
              router.push("/scan?mode=casier");
              router.refresh();
            }}
          >
            Terminé — retour au scanner
          </Btn>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Sélecteur de binôme — recherche débounce + fiche de l'élève choisi.
   Partagé par l'écran principal et la fiche de correction : une seule
   implémentation, donc un seul comportement à maintenir.
   ──────────────────────────────────────────────────────────────────────── */
function BinomePicker({
  selected,
  onSelect,
  excludeId,
}: {
  selected: ClientStudent | SearchResult | null;
  onSelect: (s: SearchResult | null) => void;
  excludeId: string;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/students/search?q=${encodeURIComponent(q)}&excludeId=${encodeURIComponent(excludeId)}`,
        );
        if (r.ok) setResults(await r.json());
      } catch {
        /* réseau */
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, excludeId]);

  if (selected) {
    return (
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
        <Avatar student={selected} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: K.display,
              fontSize: 16,
              fontWeight: 800,
              color: K.ink,
            }}
          >
            {selected.firstName} {selected.lastName}
          </div>
          <div
            style={{
              fontSize: 12,
              color: K.ink3,
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            <span style={{ fontFamily: K.mono }}>{selected.studentNumber}</span>
          </div>
        </div>
        <button
          onClick={() => onSelect(null)}
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
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: K.surfaceCool,
          borderRadius: 14,
          padding: "12px 14px",
          border: `2px solid ${K.lineStrong}`,
        }}
      >
        {Icons.search({ size: 18, stroke: K.ink3 })}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un binôme (nom, numéro, groupe)…"
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: K.display,
            fontSize: 15,
            fontWeight: 700,
            color: K.ink,
          }}
        />
        {searching && <Spinner />}
      </div>
      {results.length > 0 && (
        <div
          style={{
            marginTop: 8,
            borderRadius: 14,
            border: `1px solid ${K.line}`,
            maxHeight: 240,
            overflow: "auto",
          }}
        >
          {results.map((r) => (
            <div
              key={r.id}
              onClick={() => {
                onSelect(r);
                setQuery("");
                setResults([]);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                cursor: "pointer",
                borderBottom: `1px solid ${K.line}`,
              }}
            >
              <Avatar student={r} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: K.display,
                    fontSize: 14,
                    fontWeight: 800,
                    color: K.ink,
                  }}
                >
                  {r.firstName} {r.lastName}
                </div>
                <div style={{ fontSize: 11.5, color: K.ink3, fontWeight: 700 }}>
                  {r.group} ·{" "}
                  <span style={{ fontFamily: K.mono }}>{r.studentNumber}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Fiche de correction — groupe, grand casier, petit casier, binôme.
   En deux temps : on VÉRIFIE côté serveur (aperçu du diff, avertissements et
   conflits), puis on confirme. L'opérateur ne valide jamais à l'aveugle.
   ──────────────────────────────────────────────────────────────────────── */
function StudentEditModal({
  student,
  lockerNumber,
  petitCasier,
  binome,
  onClose,
  onSaved,
}: {
  student: ClientStudent;
  lockerNumber: string;
  petitCasier: string;
  binome: ClientStudent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [group, setGroup] = React.useState(student.group);
  const [grand, setGrand] = React.useState(lockerNumber);
  const [petit, setPetit] = React.useState(petitCasier);
  const [pair, setPair] = React.useState<ClientStudent | SearchResult | null>(
    binome,
  );
  const [preview, setPreview] = React.useState<EditPreview | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  const hasLocker = lockerNumber !== "";

  const send = async (mode: "preview" | "apply") => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/casier/student-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: student.studentNumber,
          group: group.trim(),
          petitCasier: petit.trim(),
          ...(hasLocker
            ? {
                lockerNumber: grand.trim(),
                binomeStudentNumber: pair?.studentNumber ?? "",
              }
            : {}),
          mode,
        }),
      });
      const j = await res.json().catch(() => ({}));
      // 409 = conflits métier : ils s'affichent dans le panneau, pas en erreur.
      if (res.status === 401 || res.status === 403 || res.status >= 500) {
        throw new Error(j?.error || "Échec de la vérification.");
      }
      if (mode === "apply" && res.ok && j?.applied) {
        onSaved();
        return;
      }
      setPreview({
        ok: !!j?.ok,
        changes: j?.changes ?? [],
        warnings: j?.warnings ?? [],
        conflicts: j?.conflicts ?? [],
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const blocked = (preview?.conflicts.length ?? 0) > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
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
          maxHeight: "92vh",
          overflow: "auto",
          background: "#fff",
          color: K.ink,
          borderRadius: 28,
          padding: 28,
          boxShadow: "0 30px 80px rgba(15,0,60,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* En-tête */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar student={student} size={56} />
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
              ● Modifier la fiche
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
              {student.firstName} {student.lastName}
            </div>
          </div>
          <Pill tone="primary">{student.studentNumber}</Pill>
        </div>

        {preview ? (
          <EditPreviewPanel
            preview={preview}
            busy={busy}
            onBack={() => setPreview(null)}
            onConfirm={() => send("apply")}
          />
        ) : (
          /* ── Étape 1 : les champs ──────────────────────────────────── */
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionTitle>Élève</SectionTitle>
              <EditRow
                label="Groupe scolaire"
                value={group}
                onChange={setGroup}
                placeholder="ex. 110"
              />
              <LevelHint
                group={group}
                currentGroup={student.group}
                currentLevel={student.level}
                lockerNumber={lockerNumber}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionTitle>Casier</SectionTitle>
              {hasLocker ? (
                <EditRow
                  label="Grand casier"
                  value={grand}
                  onChange={setGrand}
                  placeholder="ex. 218"
                  mono
                />
              ) : (
                <Alert
                  tone="amber"
                  title="Aucun casier attribué"
                  text="Le grand casier et le binôme se règlent à l'attribution, sur cet écran."
                />
              )}
              <EditRow
                label="Petit casier"
                value={petit}
                onChange={setPetit}
                placeholder="ex. PC-04"
                mono
              />
            </div>

            {hasLocker && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <SectionTitle>Binôme</SectionTitle>
                <BinomePicker
                  selected={pair}
                  onSelect={setPair}
                  excludeId={student.id}
                />
              </div>
            )}

            {err && (
              <div
                style={{
                  background: K.pinkSoft,
                  color: "#B2245A",
                  borderRadius: 14,
                  padding: "12px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {err}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <Btn kind="ghost" size="lg" onClick={onClose} style={{ flex: 1 }}>
                Annuler
              </Btn>
              <Btn
                kind="primary"
                size="lg"
                disabled={busy}
                icon={
                  busy ? <Spinner /> : Icons.check({ size: 20, stroke: "#fff" })
                }
                onClick={() => send("preview")}
                style={{ flex: 2 }}
              >
                {busy ? "Vérification…" : "Vérifier les changements"}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
