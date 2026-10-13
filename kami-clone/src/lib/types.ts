export type Tool = "pen" | "highlighter" | "eraser" | "text";
export type SizeKey = "s" | "m" | "l";

/** Coordenadas normalizadas 0..1 respecto al ancho/alto de la página. */
export type Ink = {
  id: string;
  kind: "ink";
  page: number;
  pts: number[]; // x0,y0,x1,y1,...
  color: string;
  width: number; // fracción del ancho de página
  highlighter: boolean;
};

export type TextNote = {
  id: string;
  kind: "text";
  page: number;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number; // fracción del ancho de página
};

export type Annotation = Ink | TextNote;

export type DocRecord = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pageCount: number;
  thumb: string;
  size: number;
};

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const PEN_WIDTHS: Record<SizeKey, number> = { s: 0.0015, m: 0.003, l: 0.0055 };
export const HL_WIDTHS: Record<SizeKey, number> = { s: 0.012, m: 0.02, l: 0.032 };
export const TEXT_SIZES: Record<SizeKey, number> = { s: 0.018, m: 0.026, l: 0.04 };

export const COLORS = ["#1c1c1e", "#007aff", "#ff3b30", "#34c759", "#ff9500", "#af52de"];
export const HL_COLORS = ["#ffd60a", "#34c759", "#ff9ecb", "#64d2ff", "#ff9500"];

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
