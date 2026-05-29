"use client";
// Ficha alumno — mode PORTABLE.
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Pill, KV, Avatar, TileIcon, Icons } from "@/components/ui";
import type { ClientStudent } from "@/lib/mappers";

type Delivery = {
  folio: string;
  deliveredAt: string;
  operatorName: string;
} | null;

export default function StudentScreen({
  student,
  delivery,
}: {
  student: ClientStudent;
  delivery: Delivery;
}) {
  const router = useRouter();
  const isDelivered = student.laptopStatus === "DELIVERED";
  const folio = delivery?.folio || `AE-26-${student.studentNumber}`;
  const [confirmingCancel, setConfirmingCancel] = React.useState(false);
  const [canceling, setCanceling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState("");

  const onBack = () => router.push("/scan?mode=laptop");
  const onConfirm = () => router.push(`/student/${student.studentNumber}/sign`);
  const openPdf = () =>
    window.open(`/api/deliveries/${folio}/pdf`, "_blank", "noopener");

  const cancelDelivery = async () => {
    if (canceling) return;
    setCanceling(true);
    setCancelError("");
    try {
      const res = await fetch(
        `/api/deliveries/${encodeURIComponent(folio)}/cancel`,
        { method: "POST" },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Erreur");
      router.refresh();
      setConfirmingCancel(false);
    } catch (e) {
      setCancelError((e as Error).message);
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", background: K.bg }}>
      {/* Left: identité */}
      <div
        style={{
          flex: 1,
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflowY: "auto",
        }}
      >
        <TopBar
          onBack={onBack}
          title="Élève trouvé"
          subtitle="Vérifiez les données avant la remise"
        />

        {/* Alerte: ne reçoit pas de portable */}
        {!student.receivesLaptop && (
          <Alert
            tone="red"
            title="Cet élève ne reçoit pas de portable"
            text="Selon le CSV importé, cet élève n'est pas sur la liste des portables."
          />
        )}
        {/* Alerte: déjà remis */}
        {isDelivered && (
          <Alert
            tone="amber"
            title="Portable déjà remis"
            text={
              delivery
                ? `Remis le ${delivery.deliveredAt} par ${delivery.operatorName}.`
                : "Ce portable a déjà été remis."
            }
          />
        )}
        {/* Identité vérifiée */}
        {!isDelivered && student.receivesLaptop && (
          <Alert
            tone="green"
            title={`Correspondance — ${student.studentNumber}`}
            text="Identité vérifiée · code élève valide."
          />
        )}

        <div
          style={{
            background: "#fff",
            borderRadius: 22,
            border: `1px solid ${K.line}`,
            padding: 26,
            boxShadow: "0 12px 30px rgba(20,24,35,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 22,
              marginBottom: 22,
            }}
          >
            <Avatar student={student} size={104} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 11,
                  color: K.ink3,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 6,
                }}
              >
                {student.group} · Secondaire {student.level}
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: K.ink,
                  letterSpacing: -1.2,
                  lineHeight: 1.05,
                  fontFamily: K.display,
                }}
              >
                {student.firstName}
                <br />
                {student.lastName}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Pill tone="primary" icon={Icons.hash({ size: 14 })}>
                  {student.studentNumber}
                </Pill>
                {student.receivesLaptop ? (
                  <Pill tone="success" icon={Icons.check({ size: 14 })}>
                    Liste portables
                  </Pill>
                ) : (
                  <Pill tone="danger">Hors liste</Pill>
                )}
              </div>
            </div>
          </div>

          <KV
            label="Numéro d'élève"
            value={student.studentNumber}
            mono
            icon={<TileIcon kind="badge" />}
          />
          <KV
            label="Courriel"
            value={student.email || "—"}
            icon={<TileIcon kind="family" />}
          />
          <KV
            label="Groupe / Niveau"
            value={`${student.group} · Secondaire ${student.level}`}
            icon={<TileIcon kind="backpack" />}
          />
          <KV
            label="Boîte N°"
            value={student.boxNumber || "—"}
            mono
            icon={<TileIcon kind="box" />}
          />
        </div>
      </div>

      {/* Right: équipement + actions */}
      <div
        style={{
          width: 520,
          background: "#fff",
          borderLeft: `1px solid ${K.line}`,
          display: "flex",
          flexDirection: "column",
          padding: "24px 26px",
          gap: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: K.ink3,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Équipement attribué
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: K.ink,
              letterSpacing: -0.5,
              marginTop: 2,
              fontFamily: K.display,
            }}
          >
            {student.laptopModel || "Modèle non précisé"}
          </div>
        </div>

        <div
          style={{
            height: 180,
            borderRadius: 18,
            background:
              "repeating-linear-gradient(135deg, #F2F0EB 0 12px, #ECEAE4 12px 14px)",
            border: `1px solid ${K.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              color: K.ink3,
              fontSize: 12,
              fontFamily: K.mono,
              fontWeight: 700,
              background: "#fff",
              padding: "6px 10px",
              borderRadius: 6,
            }}
          >
            💻 PORTABLE
          </div>
        </div>

        <div
          style={{
            background: "#F8F7F4",
            borderRadius: 16,
            padding: "4px 16px",
          }}
        >
          <KV
            label="Numéro de série"
            value={student.laptopSerial || "—"}
            mono
            icon={<TileIcon kind="laptop" />}
          />
          <KV
            label="Boîte physique"
            value={student.boxNumber || "—"}
            mono
            icon={<TileIcon kind="locker" />}
          />
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {isDelivered ? (
            <>
              <Btn
                kind="primary"
                size="lg"
                full
                icon={Icons.doc({ size: 22, stroke: "#fff" })}
                onClick={openPdf}
              >
                Voir le récépissé PDF
              </Btn>

              {cancelError && (
                <div
                  style={{
                    background: K.pinkSoft,
                    color: "#B2245A",
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  ✗ {cancelError}
                </div>
              )}

              {!confirmingCancel ? (
                <Btn
                  kind="warm"
                  size="md"
                  full
                  icon={Icons.refresh({ size: 18, stroke: "#fff" })}
                  onClick={() => {
                    setConfirmingCancel(true);
                    setCancelError("");
                  }}
                >
                  Annuler la remise (corriger)
                </Btn>
              ) : (
                <div
                  style={{
                    background: K.pinkSoft,
                    borderRadius: 14,
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: "#B2245A",
                      fontWeight: 700,
                    }}
                  >
                    Annuler la remise et effacer le récépissé PDF ? L&apos;élève
                    redevient « à remettre ». Cette action est irréversible.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn
                      kind="cta"
                      size="md"
                      disabled={canceling}
                      onClick={cancelDelivery}
                      style={{ flex: 1 }}
                    >
                      {canceling ? "Annulation…" : "Oui, annuler"}
                    </Btn>
                    <Btn
                      kind="ghost"
                      size="md"
                      onClick={() => setConfirmingCancel(false)}
                      style={{ flex: 1 }}
                    >
                      Non
                    </Btn>
                  </div>
                </div>
              )}

              <Btn
                kind="ghost"
                size="md"
                full
                icon={Icons.back({ size: 20 })}
                onClick={onBack}
              >
                Retour au scanner
              </Btn>
            </>
          ) : (
            <>
              <Btn
                kind="success"
                size="lg"
                full
                icon={Icons.check({ size: 22, stroke: "#fff" })}
                onClick={onConfirm}
              >
                Continuer vers la signature
              </Btn>
              <Btn
                kind="ghost"
                size="md"
                full
                icon={Icons.x({ size: 20 })}
                onClick={onBack}
              >
                Annuler et retourner au scanner
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function Alert({
  tone,
  title,
  text,
}: {
  tone: "red" | "amber" | "green";
  title: string;
  text: string;
}) {
  const palette = {
    red: { bg: "#FFE3EE", fg: "#B2245A", icon: "✕" },
    amber: { bg: "#FFF4D0", fg: "#8A6A14", icon: "!" },
    green: { bg: "#DCF5E5", fg: "#1F8A47", icon: "✓" },
  }[tone];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderRadius: 14,
        background: palette.bg,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          background: palette.fg,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {palette.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: palette.fg }}>
          {title}
        </div>
        <div
          style={{ fontSize: 13, color: palette.fg, fontWeight: 600, opacity: 0.85 }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

function TopBar({
  onBack,
  title,
  subtitle,
}: {
  onBack: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <button
        onClick={onBack}
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          border: `1px solid ${K.lineStrong}`,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: K.ink,
        }}
      >
        {Icons.back({ size: 22 })}
      </button>
      <div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: -0.5,
            fontFamily: K.display,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.7)",
            fontWeight: 600,
            marginTop: 2,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
