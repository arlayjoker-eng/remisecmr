"use client";
import type { SizeKey, Tool } from "@/lib/types";
import { COLORS, HL_COLORS } from "@/lib/types";
import type { Settings } from "./PageView";
import { Icon } from "./Icon";

type Props = {
  tool: Tool;
  setTool: (t: Tool) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  fingerDraw: boolean;
  setFingerDraw: (v: boolean) => void;
};

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: "pen", label: "Bolígrafo", key: "P" },
  { id: "highlighter", label: "Resaltador", key: "H" },
  { id: "eraser", label: "Borrador", key: "E" },
  { id: "text", label: "Texto", key: "T" },
];

const DOT: Record<SizeKey, number> = { s: 6, m: 10, l: 15 };

export default function Toolbar({ tool, setTool, settings, setSettings, fingerDraw, setFingerDraw }: Props) {
  const opts = tool === "eraser" ? null : settings[tool];
  const palette = tool === "highlighter" ? HL_COLORS : COLORS;
  const update = (patch: Partial<{ color: string; size: SizeKey }>) => {
    if (tool === "eraser") return;
    setSettings({ ...settings, [tool]: { ...settings[tool], ...patch } });
  };

  return (
    <div className="toolstrip" role="toolbar" aria-label="Herramientas">
      <div className="capsule">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={"tool" + (tool === t.id ? " on" : "")}
            onClick={() => setTool(t.id)}
            aria-pressed={tool === t.id}
            aria-label={t.label}
            title={`${t.label} (${t.key})`}
          >
            <Icon name={t.id === "pen" ? "pen" : t.id} />
          </button>
        ))}
        <span className="sep" />
        <button
          className={"tool" + (fingerDraw ? " on" : "")}
          onClick={() => setFingerDraw(!fingerDraw)}
          aria-pressed={fingerDraw}
          aria-label="Dibujar con el dedo"
          title="Dibujar con el dedo (si está apagado, el dedo desplaza la página)"
        >
          <Icon name="hand" />
        </button>
      </div>

      {opts && (
        <div className="capsule options">
          {palette.map((c) => (
            <button
              key={c}
              className={"swatch" + (opts.color === c ? " on" : "")}
              style={{ background: c }}
              onClick={() => update({ color: c })}
              aria-label={`Color ${c}`}
              aria-pressed={opts.color === c}
            />
          ))}
          <span className="sep" />
          {(["s", "m", "l"] as SizeKey[]).map((s) => (
            <button
              key={s}
              className={"size" + (opts.size === s ? " on" : "")}
              onClick={() => update({ size: s })}
              aria-label={`Grosor ${s}`}
              aria-pressed={opts.size === s}
            >
              <i style={{ width: DOT[s], height: DOT[s] }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
