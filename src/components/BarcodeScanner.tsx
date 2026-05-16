"use client";
// Live camera barcode/QR scanner — wraps html5-qrcode, uses the iPad rear camera.
import React from "react";
import { Html5Qrcode } from "html5-qrcode";

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
    const scanner = new Html5Qrcode(READER_ID, { verbose: false });

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
        { fps: 12, aspectRatio: 1.35 },
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
