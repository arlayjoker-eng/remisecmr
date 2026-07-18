"use client";
// Reçu / écran de succès — flux PORTABLE.
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Icons } from "@/components/ui";
import type { ClientStudent } from "@/lib/mappers";

const C = K;

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
  student: ClientStudent;
  signature: Signature;
  operatorName: string;
}) {
  const router = useRouter();
  const folio = `AE-26-${student.studentNumber}`;
  const goScan = () => router.push("/scan?mode=laptop");
  const openPdf = () =>
    window.open(`/api/deliveries/${folio}/pdf`, "_blank", "noopener");

  return (
    <div style={{ display: "flex", height: "100%", background: K.bgApp, animation: "screenIn 0.35s ease both" }}>
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
              fontFamily: K.display,
            }}
          >
            {student.firstName} {student.lastName}
            <br />a reçu son portable
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
          <Check label="Signature capturée" detail={`Par ${signature.tutorName}`} />
          <Check label="Document PDF généré" detail={`Référence ${folio}`} />
          <Check
            label="Empreinte SHA-256 appliquée"
            detail="intégrité du document"
          />
          <Check label="Archivé sur le serveur" detail="RemiseCMR · VPS" last />
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
            icon={Icons.download({ size: 20 })}
            onClick={openPdf}
          >
            Voir le PDF
          </Btn>
        </div>
      </div>

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
                color: K.ink3,
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
                color: K.ink,
                fontFamily: K.display,
              }}
            >
              Référence {folio}
            </div>
          </div>
          <Btn
            kind="light"
            size="sm"
            icon={Icons.download({ size: 18 })}
            onClick={openPdf}
          >
            PDF
          </Btn>
        </div>

        <div
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 14,
            border: `1px solid ${C.line}`,
            boxShadow: "0 18px 50px rgba(20,24,35,0.06)",
            padding: "32px 40px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            fontSize: 12,
            color: C.ink2,
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
                  style={{ fontSize: 14, fontWeight: 800, color: C.ink }}
                >
                  Collège Mont-Royal
                </div>
                <div style={{ fontSize: 11, color: C.ink3, fontWeight: 600 }}>
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
              fontFamily: K.display,
            }}
          >
            Accusé de réception — Programme 1:1
          </div>

          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
            Par la présente, <strong>{signature.tutorName}</strong>, parent
            responsable de l&apos;élève{" "}
            <strong>
              {student.firstName} {student.lastName}
            </strong>
            , reçoit en bonne et due forme le portable décrit ci-dessous et
            s&apos;engage à un usage responsable.
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
              value={`${student.firstName} ${student.lastName}`}
            />
            <DocField label="Numéro d'élève" value={student.studentNumber} mono />
            <DocField label="Groupe" value={student.group} />
            <DocField label="Niveau" value={`Secondaire ${student.level}`} />
            <DocField label="Boîte N°" value={student.boxNumber || "—"} mono />
            <DocField label="Modèle" value={student.laptopModel || "—"} />
            <DocField
              label="Série du portable"
              value={student.laptopSerial || "—"}
              mono
            />
            <DocField
              label="Série du chargeur"
              value={student.chargerSerial || "—"}
              mono
            />
            <DocField
              label="Série du crayon"
              value={student.stylusSerial || "—"}
              mono
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
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>
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
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
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
          <svg viewBox="0 0 200 60" width="80%" height="100%">
            <path
              d="M10 45 Q 25 10, 40 30 T 70 35 Q 85 18, 100 38 T 130 32 Q 150 12, 170 40"
              stroke={C.ink}
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
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
      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginTop: 2 }}>
        {name}
      </div>
      <div style={{ fontSize: 11, color: C.ink3, fontFamily: C.mono }}>
        {sub}
      </div>
    </div>
  );
}
