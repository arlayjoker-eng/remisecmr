"use client";
// Live camera barcode/QR scanner — wraps html5-qrcode, uses the iPad rear camera.
import React from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

// Formats reconnus : codes-barres 1D des carnets élèves (Code 128 prioritaire) + QR.
const FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.QR_CODE,
];

type Props = {
  onDetected: (value: string) => void;
  onError?: (message: string) => void;
};

const READER_ID = "bc-reader";

export default function BarcodeScanner({ onDetected, onError }: Props) {
  const detectedRef = React.useRef(onDetected);
  const errorRef = React.useRef(onError);
  const lastHit = React.useRef<number>(0);
  detectedRef.current = onDetected;
  errorRef.current = onError;

  React.useEffect(() => {
    let cancelled = false;
    let started = false;
    const scanner = new Html5Qrcode(READER_ID, {
      verbose: false,
      formatsToSupport: FORMATS,
    });

    const stopSafely = () => {
      try {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {
            /* already stopped */
          });
      } catch {
        /* scanner was never running */
      }
    };

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          aspectRatio: 1.5,
          // Zone rectangulaire — large et basse pour bien capter les codes 1D.
          qrbox: (vw: number, vh: number) => ({
            width: Math.round(Math.min(350, vw * 0.9)),
            height: Math.round(Math.min(150, vh * 0.6)),
          }),
        },
        (decodedText) => {
          const now = Date.now();
          if (now - lastHit.current < 2500) return; // debounce same card
          lastHit.current = now;
          detectedRef.current(decodedText.trim());
        },
        () => {
          /* per-frame decode failure — ignored */
        },
      )
      .then(() => {
        started = true;
        if (cancelled) stopSafely();
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          errorRef.current?.(
            e instanceof Error ? e.message : "Caméra indisponible",
          );
        }
      });

    return () => {
      cancelled = true;
      if (started) stopSafely();
    };
  }, []);

  return (
    <div
      id={READER_ID}
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
    />
  );
}
