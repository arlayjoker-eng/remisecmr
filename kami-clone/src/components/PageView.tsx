"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Annotation, Ink, TextNote, Tool, SizeKey } from "@/lib/types";
import { HL_WIDTHS, PEN_WIDTHS, TEXT_SIZES, uid } from "@/lib/types";

export type Settings = Record<"pen" | "highlighter" | "text", { color: string; size: SizeKey }>;

type Props = {
  pdf: any;
  num: number;
  width: number;
  aspect: number; // alto / ancho
  tool: Tool;
  settings: Settings;
  fingerDraw: boolean;
  annos: Annotation[];
  onAdd: (a: Annotation) => void;
  onRemove: (ids: string[]) => void;
};

function drawInk(ctx: CanvasRenderingContext2D, a: Ink, w: number, h: number) {
  const p = a.pts;
  ctx.save();
  ctx.lineCap = a.highlighter ? "butt" : "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = a.color;
  ctx.fillStyle = a.color;
  ctx.globalAlpha = a.highlighter ? 0.35 : 1;
  ctx.lineWidth = a.width * w;
  if (p.length <= 2) {
    ctx.beginPath();
    ctx.arc(p[0] * w, p[1] * h, Math.max(0.5, (a.width * w) / 2), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(p[0] * w, p[1] * h);
    for (let i = 2; i < p.length - 2; i += 2) {
      ctx.quadraticCurveTo(p[i] * w, p[i + 1] * h, ((p[i] + p[i + 2]) / 2) * w, ((p[i + 1] + p[i + 3]) / 2) * h);
    }
    ctx.lineTo(p[p.length - 2] * w, p[p.length - 1] * h);
    ctx.stroke();
  }
  ctx.restore();
}

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export default function PageView({ pdf, num, width, aspect, tool, settings, fingerDraw, annos, onAdd, onRemove }: Props) {
  const height = width * aspect;
  const wrap = useRef<HTMLDivElement>(null);
  const pdfCanvas = useRef<HTMLCanvasElement>(null);
  const inkCanvas = useRef<HTMLCanvasElement>(null);
  const [seen, setSeen] = useState(false);
  const cur = useRef<Ink | null>(null);
  const erasing = useRef(false);
  const hidden = useRef<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string; x: number; y: number } | null>(null);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const area = useRef<HTMLTextAreaElement>(null);
  const [dpr, setDpr] = useState(1);

  useEffect(() => setDpr(Math.min(window.devicePixelRatio || 1, 2.5)), []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.some((e) => e.isIntersecting) && setSeen(true),
      { rootMargin: "900px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Render del PDF
  useEffect(() => {
    if (!seen || !pdf) return;
    let task: any;
    let cancelled = false;
    (async () => {
      const page = await pdf.getPage(num);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: (width / base.width) * dpr });
      const c = pdfCanvas.current!;
      c.width = Math.floor(vp.width);
      c.height = Math.floor(vp.height);
      task = page.render({ canvasContext: c.getContext("2d")!, viewport: vp });
      try { await task.promise; } catch { /* cancelado */ }
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [seen, pdf, num, width, dpr]);

  const paint = useCallback(() => {
    const c = inkCanvas.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const a of annos) if (a.kind === "ink" && !hidden.current.has(a.id)) drawInk(ctx, a, width, height);
    if (cur.current) drawInk(ctx, cur.current, width, height);
  }, [annos, width, height, dpr]);

  useEffect(() => {
    const c = inkCanvas.current!;
    c.width = Math.floor(width * dpr);
    c.height = Math.floor(height * dpr);
    hidden.current.clear();
    paint();
  }, [width, height, dpr, paint]);

  const pos = (e: React.PointerEvent) => {
    const r = inkCanvas.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height] as const;
  };

  const eraseAt = (x: number, y: number) => {
    const rad = 10; // px
    let changed = false;
    for (const a of annos) {
      if (a.kind !== "ink" || hidden.current.has(a.id)) continue;
      const p = a.pts;
      const reach = rad + (a.width * width) / 2;
      let hit = false;
      if (p.length <= 2) hit = Math.hypot((p[0] - x) * width, (p[1] - y) * height) <= reach;
      for (let i = 0; !hit && i + 3 < p.length; i += 2) {
        hit = distToSeg(x * width, y * height, p[i] * width, p[i + 1] * height, p[i + 2] * width, p[i + 3] * height) <= reach;
      }
      if (hit) { hidden.current.add(a.id); changed = true; }
    }
    if (changed) paint();
  };

  const commitEditing = (id?: string) => {
    const ed = editingRef.current;
    if (!ed || (id && ed.id !== id)) return;
    const text = (area.current?.value ?? "").trimEnd();
    editingRef.current = null;
    setEditing(null);
    if (text.trim()) {
      const s = settings.text;
      const note: TextNote = { id: uid(), kind: "text", page: num, x: ed.x, y: ed.y, text, color: s.color, size: TEXT_SIZES[s.size] };
      onAdd(note);
    }
  };

  const down = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" && !fingerDraw) return;
    const [x, y] = pos(e);
    if (tool === "text") {
      e.preventDefault(); // evita que el clic en el canvas le quite el foco al cuadro de texto
      commitEditing();
      const next = { id: uid(), x, y };
      editingRef.current = next;
      setEditing(next);
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    if (tool === "eraser") {
      erasing.current = true;
      eraseAt(x, y);
      return;
    }
    const s = settings[tool];
    cur.current = {
      id: uid(), kind: "ink", page: num, pts: [x, y], color: s.color,
      width: (tool === "highlighter" ? HL_WIDTHS : PEN_WIDTHS)[s.size], highlighter: tool === "highlighter",
    };
    paint();
  };

  const move = (e: React.PointerEvent) => {
    const [x, y] = pos(e);
    if (erasing.current) return eraseAt(x, y);
    const s = cur.current;
    if (!s) return;
    const n = s.pts.length;
    if (Math.hypot((x - s.pts[n - 2]) * width, (y - s.pts[n - 1]) * height) < 1.2) return;
    s.pts.push(x, y);
    paint();
  };

  const up = () => {
    if (erasing.current) {
      erasing.current = false;
      const ids = [...hidden.current];
      hidden.current.clear();
      if (ids.length) onRemove(ids);
      return;
    }
    const s = cur.current;
    cur.current = null;
    if (s) onAdd(s);
  };

  useEffect(() => {
    if (!editing) return;
    const raf = requestAnimationFrame(() => area.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [editing]);

  const drawing = tool !== "text" ? "crosshair" : "text";
  const texts = annos.filter((a): a is TextNote => a.kind === "text");

  return (
    <div ref={wrap} className="page" style={{ width, height }} data-page={num}>
      <canvas ref={pdfCanvas} style={{ width, height }} />
      <canvas
        ref={inkCanvas}
        className="ink"
        style={{ width, height, cursor: drawing, touchAction: fingerDraw || tool === "text" ? "none" : "pan-y pinch-zoom" }}
        onPointerDown={down}
        onMouseDown={(e) => tool === "text" && e.preventDefault()}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
      {texts.map((t) => (
        <div
          key={t.id}
          className={"note" + (tool === "eraser" ? " erasable" : "")}
          style={{ left: t.x * width, top: t.y * height, fontSize: t.size * width, color: t.color, pointerEvents: tool === "eraser" ? "auto" : "none" }}
          onPointerDown={() => tool === "eraser" && onRemove([t.id])}
        >
          {t.text}
        </div>
      ))}
      {editing && (
        <textarea
          key={editing.id}
          ref={area}
          className="note editing"
          aria-label="Texto"
          style={{ left: editing.x * width, top: editing.y * height, fontSize: TEXT_SIZES[settings.text.size] * width, color: settings.text.color }}
          onBlur={() => commitEditing(editing.id)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { editingRef.current = null; setEditing(null); }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEditing(editing.id);
          }}
          onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
          rows={1}
        />
      )}
      <span className="pageno">{num}</span>
    </div>
  );
}
