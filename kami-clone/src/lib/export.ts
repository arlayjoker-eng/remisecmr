import { PDFDocument, StandardFonts, rgb, LineCapStyle } from "pdf-lib";
import type { Annotation } from "./types";

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// Helvetica estándar solo codifica WinAnsi: lo demás se sustituye por "?"
function safe(font: { encodeText: (t: string) => unknown }, line: string) {
  let out = "";
  for (const ch of line) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += "?";
    }
  }
  return out;
}

function inkPath(pts: number[], w: number, h: number) {
  const P = (i: number) => [pts[i] * w, pts[i + 1] * h];
  if (pts.length <= 2) {
    const [x, y] = P(0);
    return `M ${x} ${y} L ${x + 0.01} ${y}`;
  }
  let d = `M ${P(0)[0]} ${P(0)[1]}`;
  for (let i = 2; i < pts.length - 2; i += 2) {
    const [x, y] = P(i);
    const [nx, ny] = P(i + 2);
    d += ` Q ${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const last = P(pts.length - 2);
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}

export async function exportPdf(bytes: ArrayBuffer, annos: Annotation[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes.slice(0), { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();

  for (const a of annos) {
    const page = pages[a.page - 1];
    if (!page) continue;
    const { width: w, height: h } = page.getSize();

    if (a.kind === "ink") {
      page.drawSvgPath(inkPath(a.pts, w, h), {
        x: 0,
        y: h,
        borderColor: hex(a.color),
        borderWidth: a.width * w,
        borderOpacity: a.highlighter ? 0.35 : 1,
        borderLineCap: a.highlighter ? LineCapStyle.Butt : LineCapStyle.Round,
      });
    } else {
      const size = a.size * w;
      a.text.split("\n").forEach((line, i) => {
        page.drawText(safe(font, line), {
          x: a.x * w,
          y: h - a.y * h - size * (1 + i * 1.25),
          size,
          font,
          color: hex(a.color),
        });
      });
    }
  }
  return pdf.save();
}

export function download(data: Uint8Array, name: string) {
  const blob = new Blob([data as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
