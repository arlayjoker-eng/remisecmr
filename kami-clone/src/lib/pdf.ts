/* eslint-disable @typescript-eslint/no-explicit-any */
let lib: Promise<any> | null = null;

export function pdfjs(): Promise<any> {
  if (!lib) {
    lib = import("pdfjs-dist").then((m: any) => {
      m.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
      return m;
    });
  }
  return lib;
}

export async function openPdf(bytes: ArrayBuffer): Promise<any> {
  const m = await pdfjs();
  // pdf.js transfiere el buffer al worker: se le pasa una copia
  return m.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
}

export async function makeThumb(pdf: any): Promise<string> {
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const vp = page.getViewport({ scale: 360 / base.width });
  const c = document.createElement("canvas");
  c.width = Math.floor(vp.width);
  c.height = Math.floor(vp.height);
  await page.render({ canvasContext: c.getContext("2d")!, viewport: vp }).promise;
  return c.toDataURL("image/jpeg", 0.8);
}
