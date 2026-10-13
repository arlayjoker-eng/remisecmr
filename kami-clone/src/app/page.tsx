"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { createDoc, deleteDoc, listDocs, renameDoc } from "@/lib/db";
import { makeThumb, openPdf } from "@/lib/pdf";
import { MAX_FILE_BYTES, uid, type DocRecord } from "@/lib/types";

const fmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" });

export default function Library() {
  const [docs, setDocs] = useState<DocRecord[] | null>(null);
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => setDocs(await listDocs()), []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const errors: string[] = [];
    for (const f of Array.from(files)) {
      try {
        if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) throw new Error("no es un PDF");
        if (f.size > MAX_FILE_BYTES) throw new Error("supera los 25 MB");
        const bytes = await f.arrayBuffer();
        const pdf = await openPdf(bytes);
        const thumb = await makeThumb(pdf);
        const now = Date.now();
        await createDoc(
          { id: uid(), title: f.name.replace(/\.pdf$/i, ""), createdAt: now, updatedAt: now, pageCount: pdf.numPages, thumb, size: f.size },
          bytes,
        );
      } catch (e) {
        const msg = (e as Error)?.name === "PasswordException" ? "está protegido con contraseña" : (e as Error).message || "no se pudo abrir";
        errors.push(`${f.name}: ${msg}`);
      }
    }
    if (input.current) input.current.value = "";
    await refresh();
    setBusy(false);
    if (errors.length) setToast(errors.join(" · "));
  };

  const shown = useMemo(
    () => (docs ?? []).filter((d) => d.title.toLowerCase().includes(q.trim().toLowerCase())),
    [docs, q],
  );

  return (
    <main className="lib">
      <header>
        <h1>Biblioteca</h1>
        <button className="addbtn" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? <span className="spin" /> : <Icon name="plus" size={20} />}
          Importar PDF
        </button>
        <input ref={input} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => onFiles(e.target.files)} data-testid="file-input" />
      </header>

      <label className="search">
        <Icon name="search" size={18} />
        <input type="search" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar documentos" />
      </label>

      {docs === null ? null : docs.length === 0 ? (
        <div className="empty">
          <div className="glyph"><Icon name="file" size={32} /></div>
          <h2>Aún no hay documentos</h2>
          <p>Importa un PDF para anotarlo con el bolígrafo, el resaltador o texto.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty"><p>Sin resultados para “{q}”.</p></div>
      ) : (
        <div className="grid">
          {shown.map((d) => (
            <div className="card" key={d.id}>
              <Link href={`/doc/${d.id}`} className="thumb" aria-label={`Abrir ${d.title}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.thumb} alt="" />
              </Link>
              <div className="meta">
                <div>
                  <div className="name">{d.title}</div>
                  <div className="sub">{fmt.format(d.updatedAt)} · {d.pageCount} {d.pageCount === 1 ? "pág." : "págs."}</div>
                </div>
                <button className="more" aria-label={`Opciones de ${d.title}`} onClick={() => setMenu(menu === d.id ? null : d.id)}>
                  <Icon name="more" size={20} />
                </button>
              </div>
              {menu === d.id && (
                <>
                  <div className="scrim" onClick={() => setMenu(null)} />
                  <div className="menu" role="menu">
                    <button role="menuitem" onClick={async () => {
                      setMenu(null);
                      const t = window.prompt("Nuevo nombre", d.title)?.trim();
                      if (t) { await renameDoc(d.id, t); refresh(); }
                    }}>
                      Cambiar nombre <Icon name="edit" size={18} />
                    </button>
                    <button role="menuitem" className="danger" onClick={async () => {
                      setMenu(null);
                      if (window.confirm(`¿Eliminar “${d.title}” y sus anotaciones? No se puede deshacer.`)) { await deleteDoc(d.id); refresh(); }
                    }}>
                      Eliminar <Icon name="trash" size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
