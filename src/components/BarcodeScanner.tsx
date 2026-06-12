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

// Bip de confirmation + vibration au scan réussi (best-effort — silencieux
// si le navigateur bloque l'audio avant le premier geste utilisateur).
let audioCtx: AudioContext | null = null;
function scanFeedback() {
  try {
    type W = typeof window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext || (window as W).webkitAudioContext;
    if (AC) {
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.value = 1318; // mi aigu — bip court et net
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.28, audioCtx.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.16);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.18);
    }
  } catch {
    /* audio indisponible */
  }
  try {
    navigator.vibrate?.(60);
  } catch {
    /* pas de vibration */
  }
}

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
          scanFeedback();
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
