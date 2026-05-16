"use client";
// Receipt / success screen — confirmation + PDF preview.
// Port of `screen-receipt-kido.jsx` (translated to French for consistency).
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Icons } from "@/components/ui";

const C = K;

type Student = {
  id: string;
  first: string;
  last: string;
  group: string;
  box: string;
  device: string;
  serial: string;
  accessories: string[];
};

type Signature = {
  tutorName: string;
  tutorId: string;
  signaturePng: string | null;
};

export default function ReceiptScreen({
  student,
  signature,
  operatorName,
}: {
  student: Student;
  signature: Signature;
  operatorName: string;
}) {
  const router = useRouter();
  const folio = `AE-26-${student.id.slice(-4)}`;
  const goScan = () => router.push("/scan");
  const openPdf = () =>
    window.open(`/api/deliveries/${folio}/pdf`, "_blank", "noopener");

  return (
    <div style={{ display: "flex", height: "100%", background: C.bg }}>
      {/* Left: success */}
      <div
        style={{
          width: 520,
          padding: "32px 30px",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRight: `1px solid ${C.line}`,
          gap: 18,
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 28,
            background: C.successSoft,
            color: C.success,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Icons.check({ size: 48, stroke: "currentColor", strokeWidth: 2.4 })}
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              color: C.ink3,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Remise complétée
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: C.ink,
              letterSpacing: -1.2,
              lineHeight: 1.05,
              marginTop: 4,
            }}
          >
            {student.first} {student.last}
            <br />a reçu son équipement
          </div>
        </div>

        <div
          style={{
            background: "#FBFAF6",
            borderRadius: 16,
            border: `1px solid ${C.line}`,
            padding: "4px 18px",
          }}
        >
          <Check
            label="Signature capturée"
            detail={`Par ${signature.tutorName}`}
          />
          <Check
            label="Document PDF généré"
            detail={`Référence ${folio}`}
          />
          <Check
            label="Empreinte SHA-256 appliquée"
            detail="intégrité du document"
          />
          <Check
            label="Archivé sur le serveur"
            detail="RemiseCMR · VPS"
            last
          />
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn
            kind="primary"
            size="lg"
            full
            icon={Icons.scan({ size: 22, stroke: "#fff" })}
            onClick={goScan}
          >
            Scanner l&apos;élève suivant
          </Btn>
          <Btn
            kind="ghost"
            size="md"
            full
            icon={Icons.list({ size: 20 })}
            onClick={goScan}
          >
            Retour à l&apos;accueil
          </Btn>
        </div>
      </div>

      {/* Right: document */}
      <div
        style={{
          flex: 1,
          padding: "32px 30px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.7)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Acte de remise
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: -0.5,
              }}
            >
              Référence {folio}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn
              kind="light"
              size="sm"
              icon={Icons.download({ size: 18 })}
              onClick={openPdf}
            >
              PDF
            </Btn>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 14,
            border: `1px solid ${C.line}`,
            boxShadow:
              "0 1px 0 rgba(20,24,35,0.02), 0 18px 50px rgba(20,24,35,0.06)",
            padding: "32px 40px",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            fontSize: 12,
            color: C.ink2,
            lineHeight: 1.55,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: "#fff",
                  padding: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${C.line}`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/cmr-logo.png"
                  alt="CMR"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: C.ink,
                    letterSpacing: -0.2,
                  }}
                >
                  Collège Mont-Royal
                </div>
                <div
                  style={{ fontSize: 11, color: C.ink3, fontWeight: 600 }}
                >
                  Campus principal · Année scolaire 2025–2026
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
              <div style={{ fontWeight: 700, color: C.ink }}>{folio}</div>
              <div>{new Date().toLocaleDateString("fr-FR")}</div>
            </div>
          </div>

          <div style={{ height: 1, background: C.line }} />

          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: C.ink,
              letterSpacing: -0.4,
              lineHeight: 1.1,
            }}
          >
            Accusé de réception — Programme 1:1
          </div>

          <p style={{ margin: 0, fontSize: 13 }}>
            Par la présente, <strong>{signature.tutorName}</strong>, en qualité
            de parent responsable de l&apos;élève{" "}
            <strong>
              {student.first} {student.last}
            </strong>
            , reçoit en bonne et due forme l&apos;équipement et les accessoires
            décrits ci-dessous. Le signataire reconnaît les avoir vérifiés
            physiquement et s&apos;engage à un usage responsable.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px 22px",
              padding: "14px 0",
              borderTop: `1px solid ${C.line}`,
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <DocField
              label="Élève"
              value={`${student.first} ${student.last}`}
            />
            <DocField label="Matricule" value={student.id} mono />
            <DocField label="Classe / Niveau" value={student.group} />
            <DocField label="Casier physique" value={student.box} mono />
            <DocField label="Équipement" value={student.device} />
            <DocField label="Numéro de série" value={student.serial} mono />
            <DocField
              label="Accessoires"
              value={student.accessories.join(", ")}
              span
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 22,
              paddingTop: 6,
            }}
          >
            <SigBlock
              label="Signature du parent"
              name={signature.tutorName}
              sub={`CNI …${signature.tutorId || "0000"}`}
              signaturePng={signature.signaturePng}
            />
            <SigBlock
              label="Opérateur"
              name={operatorName}
              sub="Coordination Informatique"
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "auto",
              paddingTop: 14,
              borderTop: `1px solid ${C.line}`,
              fontSize: 10,
              color: C.ink3,
              fontFamily: C.mono,
            }}
          >
            <div>
              Document horodaté et archivé · empreinte SHA-256 · RemiseCMR
            </div>
            <MiniQR />
          </div>
        </div>
      </div>
    </div>
  );
}

function Check({
  label,
  detail,
  last,
}: {
  label: string;
  detail: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        borderTop: last ? "none" : `1px solid ${C.line}`,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          background: C.success,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {Icons.check({ size: 16, stroke: "#fff", strokeWidth: 2.5 })}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: C.ink,
            letterSpacing: -0.2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.ink3,
            fontFamily: C.mono,
            marginTop: 1,
          }}
        >
          {detail}
        </div>
      </div>
    </div>
  );
}

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
          fontSize: 9,
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
          fontSize: 13,
          fontWeight: 600,
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

function SigBlock({
  label,
  name,
  sub,
  signaturePng,
}: {
  label: string;
  name: string;
  sub: string;
  signaturePng?: string | null;
}) {
  return (
    <div>
      <div
        style={{
          height: 80,
          borderBottom: `1px solid ${C.ink2}`,
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        {signaturePng ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signaturePng}
            alt="signature"
            style={{ maxHeight: "100%", maxWidth: "100%" }}
          />
        ) : (
          <FauxSig />
        )}
      </div>
      <div
        style={{
          fontSize: 11,
          color: C.ink3,
          marginTop: 4,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.7,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: C.ink,
          marginTop: 2,
        }}
      >
        {name}
      </div>
      <div style={{ fontSize: 11, color: C.ink3, fontFamily: C.mono }}>
        {sub}
      </div>
    </div>
  );
}

function FauxSig() {
  return (
    <svg viewBox="0 0 200 60" width="80%" height="100%">
      <path
        d="M10 45 Q 25 10, 40 30 T 70 35 Q 85 18, 100 38 T 130 32 Q 150 12, 170 40"
        stroke={C.ink}
        fill="none"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M55 48 Q 75 42, 100 48"
        stroke={C.ink}
        fill="none"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MiniQR() {
  const seed = [
    "1111111",
    "1000001",
    "1011101",
    "1011101",
    "1011101",
    "1000001",
    "1111111",
  ];
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < seed.length; r++)
    for (let c = 0; c < seed[r].length; c++)
      if (seed[r][c] === "1")
        cells.push(
          <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill={C.ink} />,
        );
  return (
    <svg viewBox="0 0 7 7" width="36" height="36">
      {cells}
    </svg>
  );
}
