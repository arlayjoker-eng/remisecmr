"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import PageView, { type Settings } from "@/components/PageView";
import Toolbar from "@/components/Toolbar";
import { getDoc, getFile, loadAnnotations, renameDoc, saveAnnotations } from "@/lib/db";
import { download, exportPdf } from "@/lib/export";
import { openPdf } from "@/lib/pdf";
import type { Annotation, DocRecord, Tool } from "@/lib/types";

type Hist = { annos: Annotation[]; past: Annotation[][]; future: Annotation[][] };
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocRecord | null>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [aspects, setAspects] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hist, setHist] = useState<Hist>({ annos: [], past: [], future: [] });
  const [tool, setTool] = useState<Tool>("pen");
  const [settings, setSettings] = useState<Settings>({
    pen: { color: "#1c1c1e", size: "m" },
    highlighter: { color: "#ffd60a", size: "m" },
    text: { color: "#1c1c1e", size: "m" },
  });
  const [fingerDraw, setFingerDraw] = useState(false);
  const [zoomIdx, setZoomIdx] = useState(2);
  const [boxW, setBoxW] = useState(800);
  const [status, setStatus] = useState<"" | "saving" | "saved">("");
  const [exporting, setExporting] = useState(false);
  const [current, setCurrent] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  const bytes = useRef<ArrayBuffer | null>(null);
  const loaded = useRef(false);

  // Carga
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const [d, buf, annos] = await Promise.all([getDoc(id), getFile(id), loadAnnotations(id)]);
        if (!d || !buf) throw new Error("No se encontró el documento.");
        bytes.current = buf;
        const p = await openPdf(buf);
        const asp: number[] = [];
        for (let i = 1; i <= p.numPages; i++) {
          const v = (await p.getPage(i)).getViewport({ scale: 1 });
          asp.push(v.height / v.width);
        }
        if (dead) return;
        setDoc(d);
        setPdf(p);
        setAspects(asp);
        setHist({ annos, past: [], future: [] });
        loaded.current = true;
      } catch (e) {
        if (!dead) setError((e as Error).message || "No se pudo abrir el PDF.");
      }
    })();
    return () => { dead = true; };
  }, [id]);

  // Ancho disponible
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, [pdf]);

  // Guardado con retraso
  useEffect(() => {
    if (!loaded.current) return;
    setStatus("saving");
    const t = setTimeout(async () => {
      await saveAnnotations(id, hist.annos);
      setStatus("saved");
    }, 500);
    return () => clearTimeout(t);
  }, [hist.annos, id]);

  const apply = useCallback((fn: (a: Annotation[]) => Annotation[]) => {
    setHist((s) => ({ annos: fn(s.annos), past: [...s.past.slice(-99), s.annos], future: [] }));
  }, []);
  const undo = useCallback(() => setHist((s) => s.past.length ? { annos: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.annos, ...s.future] } : s), []);
  const redo = useCallback(() => setHist((s) => s.future.length ? { annos: s.future[0], past: [...s.past, s.annos], future: s.future.slice(1) } : s), []);

  const onAdd = useCallback((a: Annotation) => apply((l) => [...l, a]), [apply]);
  const onRemove = useCallback((ids: string[]) => apply((l) => l.filter((a) => !ids.includes(a.id))), [apply]);

  // Atajos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mod) return;
      const k = e.key.toLowerCase();
      if (k === "p") setTool("pen");
      else if (k === "h") setTool("highlighter");
      else if (k === "e") setTool("eraser");
      else if (k === "t") setTool("text");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const byPage = useMemo(() => {
    const m = new Map<number, Annotation[]>();
    for (const a of hist.annos) m.set(a.page, [...(m.get(a.page) ?? []), a]);
    return m;
  }, [hist.annos]);

  const zoom = ZOOMS[zoomIdx];
  const baseW = Math.max(240, Math.min(boxW - 32, 880));
  const pageW = Math.round(baseW * zoom);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const mid = el.getBoundingClientRect().top + el.clientHeight / 2;
    const pages = el.querySelectorAll<HTMLElement>("[data-page]");
    for (const p of Array.from(pages)) {
      const r = p.getBoundingClientRect();
      if (r.bottom >= mid) { setCurrent(Number(p.dataset.page)); break; }
    }
  };

  const doExport = async () => {
    if (!bytes.current || !doc) return;
    setExporting(true);
    try {
      const out = await exportPdf(bytes.current, hist.annos);
      download(out, `${doc.title}-anotado.pdf`);
    } catch (e) {
      setError(`No se pudo exportar: ${(e as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <div className="editor">
        <div className="bar"><Link href="/" className="textbtn"><Icon name="back" /> Biblioteca</Link></div>
        <div className="center-msg"><div><p>{error}</p><Link href="/">Volver a la biblioteca</Link></div></div>
      </div>
    );
  }

  return (
    <div className="editor">
      <div className="bar">
        <Link href="/" className="textbtn" aria-label="Volver a la biblioteca"><Icon name="back" /> Biblioteca</Link>
        <div className="grow">
          {doc && (
            <input
              className="titleinput"
              aria-label="Título"
              defaultValue={doc.title}
              onBlur={(e) => { const t = e.target.value.trim(); if (t && t !== doc.title) { renameDoc(id, t); setDoc({ ...doc, title: t }); } else e.target.value = doc.title; }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          )}
          <div className="saved" aria-live="polite">{status === "saving" ? "Guardando…" : status === "saved" ? "Guardado" : ""}</div>
        </div>
        <button className="iconbtn" onClick={undo} disabled={!hist.past.length} aria-label="Deshacer"><Icon name="undo" /></button>
        <button className="iconbtn" onClick={redo} disabled={!hist.future.length} aria-label="Rehacer"><Icon name="redo" /></button>
        <button className="iconbtn" onClick={doExport} disabled={!pdf || exporting} aria-label="Exportar PDF anotado" title="Exportar PDF anotado">
          {exporting ? <span className="spin" /> : <Icon name="share" />}
        </button>
      </div>

      <Toolbar tool={tool} setTool={setTool} settings={settings} setSettings={setSettings} fingerDraw={fingerDraw} setFingerDraw={setFingerDraw} />

      <div className="scroller" ref={scroller} onScroll={onScroll}>
        {!pdf ? (
          <div className="center-msg"><span className="spin" /></div>
        ) : (
          <div className="pages">
            {aspects.map((asp, i) => (
              <PageView
                key={i}
                pdf={pdf}
                num={i + 1}
                width={pageW}
                aspect={asp}
                tool={tool}
                settings={settings}
                fingerDraw={fingerDraw}
                annos={byPage.get(i + 1) ?? []}
                onAdd={onAdd}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>

      {pdf && <div className="pill" aria-live="polite">{current} / {aspects.length}</div>}
      {pdf && (
        <div className="floater">
          <button className="iconbtn" onClick={() => setZoomIdx((z) => Math.max(0, z - 1))} disabled={zoomIdx === 0} aria-label="Alejar"><Icon name="minus" /></button>
          <span className="z">{Math.round(zoom * 100)}%</span>
          <button className="iconbtn" onClick={() => setZoomIdx((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoomIdx === ZOOMS.length - 1} aria-label="Acercar"><Icon name="plus" /></button>
        </div>
      )}
    </div>
  );
}
