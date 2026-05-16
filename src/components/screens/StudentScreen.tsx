"use client";
// Student detail — shown after a successful scan (laptop flow).
// Port of `screen-student-kido.jsx`, wired to the router.
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Pill, KV, Avatar, TileIcon, Icons } from "@/components/ui";

type Student = {
  id: string;
  code: string;
  first: string;
  last: string;
  group: string;
  box: string;
  device: string;
  serial: string;
  accessories: string[];
  tutor: string;
  tutorPhone: string;
  paid: boolean;
  status: string;
  color: number;
  deliveredAt: string | null;
};

export default function StudentScreen({ student }: { student: Student }) {
  const router = useRouter();
  const isDelivered = student.status === "delivered";
  const folio = `AE-26-${student.id.slice(-4)}`;

  const onBack = () => router.push("/scan");
  const onConfirm = () => router.push(`/student/${student.id}/sign`);
  const openPdf = () =>
    window.open(`/api/deliveries/${folio}/pdf`, "_blank", "noopener");

  return (
    <div style={{ display: "flex", height: "100%", background: K.bg }}>
      {/* Left: identity */}
      <div
        style={{
          flex: 1,
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          overflowY: "auto",
        }}
      >
        <TopBar
          onBack={onBack}
          title={isDelivered ? "Fiche de remise" : "Élève trouvé"}
          subtitle={
            isDelivered
              ? `Remis aujourd'hui${student.deliveredAt ? ` à ${student.deliveredAt}` : ""}`
              : "Vérifiez les données avant la remise"
          }
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 18px",
            borderRadius: 14,
            background: K.successSoft,
            border: "1px solid oklch(0.85 0.07 150)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: K.success,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Icons.check({ size: 22, stroke: "#fff" })}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "oklch(0.32 0.12 150)",
              }}
            >
              {isDelivered
                ? `Remise complétée — Réf. ${folio}`
                : `Correspondance 1 sur 1 — ${student.code}`}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "oklch(0.38 0.10 150)",
                fontWeight: 600,
              }}
            >
              {isDelivered
                ? "Récépissé signé · archivé sur le serveur RemiseCMR"
                : "Identité vérifiée · code élève valide"}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 22,
            border: `1px solid ${K.line}`,
            padding: 26,
            boxShadow:
              "0 1px 0 rgba(20,24,35,0.02), 0 12px 30px rgba(20,24,35,0.04)",
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
                {student.group}
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: K.ink,
                  letterSpacing: -1.2,
                  lineHeight: 1.05,
                }}
              >
                {student.first}
                <br />
                {student.last}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Pill tone="primary" icon={Icons.hash({ size: 14 })}>
                  {student.id}
                </Pill>
                {student.paid ? (
                  <Pill tone="success" icon={Icons.check({ size: 14 })}>
                    Compte à jour
                  </Pill>
                ) : (
                  <Pill tone="warn">Solde impayé</Pill>
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
            value={student.box}
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
      </div>

      {/* Right: device + actions */}
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
            }}
          >
            {student.device}
          </div>
        </div>

        <div
          style={{
            height: 200,
            borderRadius: 18,
            background:
              "repeating-linear-gradient(135deg, #F2F0EB 0 12px, #ECEAE4 12px 14px)",
            border: `1px solid ${K.line}`,
            position: "relative",
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
              letterSpacing: 0.5,
            }}
          >
            PHOTO DE L&apos;ÉQUIPEMENT · {student.serial.slice(-6)}
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
            value={student.serial}
            mono
            icon={<TileIcon kind="laptop" />}
          />
          <KV
            label="Casier physique"
            value={student.box}
            mono
            icon={<TileIcon kind="locker" />}
          />
          <div style={{ padding: "14px 0", borderTop: `1px solid ${K.line}` }}>
            <div
              style={{
                fontSize: 11,
                color: K.ink3,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              Accessoires inclus
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {student.accessories.map((a) => (
                <span
                  key={a}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "#fff",
                    border: `1px solid ${K.line}`,
                    fontSize: 13,
                    fontWeight: 600,
                    color: K.ink2,
                  }}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
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
                Voir et imprimer le PDF
              </Btn>
              <Btn
                kind="ghost"
                size="md"
                full
                icon={Icons.back({ size: 20 })}
                onClick={onBack}
              >
                Retour à la liste
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
                Marquer comme remis
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
            color: K.ink,
            letterSpacing: -0.5,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: K.ink3,
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
