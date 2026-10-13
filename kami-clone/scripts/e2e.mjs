// Prueba de humo: importar PDF -> dibujar -> texto -> deshacer -> recargar -> exportar
import { chromium } from "playwright-core";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = "test-output";
mkdirSync(OUT, { recursive: true });

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
for (let i = 1; i <= 3; i++) {
  const p = pdf.addPage([595, 842]);
  p.drawText(`Ejercicio de prueba - pagina ${i}`, { x: 50, y: 780, size: 22, font, color: rgb(0.1, 0.1, 0.1) });
  p.drawText("Subraya la respuesta correcta.", { x: 50, y: 740, size: 14, font });
}
writeFileSync(`${OUT}/sample.pdf`, await pdf.save());

const exe = process.env.CHROME ?? "/opt/pw-browsers/chromium";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on("response", (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

const ok = (c, msg) => { console.log((c ? "OK   " : "FAIL ") + msg); if (!c) process.exitCode = 1; };

await page.goto(BASE);
await page.screenshot({ path: `${OUT}/1-biblioteca-vacia.png` });
ok(await page.getByText("Aún no hay documentos").isVisible(), "biblioteca vacía");

await page.setInputFiles('[data-testid="file-input"]', `${OUT}/sample.pdf`);
await page.getByText("sample").first().waitFor();
await page.screenshot({ path: `${OUT}/2-biblioteca.png` });
ok(true, "PDF importado");

await page.getByRole("link", { name: /Abrir sample/ }).click();
await page.waitForSelector(".page canvas.ink");
await page.waitForTimeout(1200);

const ink = page.locator(".page canvas.ink").first();
const box = await ink.boundingBox();
const stroke = async (pts) => {
  await page.mouse.move(box.x + pts[0][0], box.y + pts[0][1]);
  await page.mouse.down();
  for (const [x, y] of pts.slice(1)) await page.mouse.move(box.x + x, box.y + y, { steps: 6 });
  await page.mouse.up();
};

// bolígrafo
await stroke([[60, 200], [150, 170], [240, 210], [330, 175]]);
// resaltador
await page.getByRole("button", { name: "Resaltador" }).click();
await stroke([[50, 115], [330, 115]]);
// texto
await page.getByRole("button", { name: "Texto" }).click();
await ink.click({ position: { x: 80, y: 300 } });
await page.locator("textarea.note").fill("Respuesta: B");
await page.getByRole("button", { name: "Bolígrafo" }).click(); // blur => confirma
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/3-editor.png` });

const inkPixels = async () => page.evaluate(() => {
  const c = document.querySelector(".page canvas.ink");
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n;
});
const before = await inkPixels();
ok(before > 500, `trazos pintados (${before} px)`);
ok(await page.getByText("Respuesta: B").isVisible(), "texto visible");

// deshacer el texto y rehacer
await page.getByRole("button", { name: "Deshacer" }).click();
ok(!(await page.getByText("Respuesta: B").isVisible().catch(() => false)), "deshacer quita el texto");
await page.getByRole("button", { name: "Rehacer" }).click();
ok(await page.getByText("Respuesta: B").isVisible(), "rehacer devuelve el texto");

// borrador: borra el trazo de bolígrafo
await page.getByRole("button", { name: "Borrador" }).click();
await stroke([[150, 160], [150, 220]]);
await page.waitForTimeout(200);
const after = await inkPixels();
ok(after < before, `borrador reduce los trazos (${before} -> ${after})`);
await page.getByRole("button", { name: "Deshacer" }).click();
ok((await inkPixels()) === before, "deshacer restaura el trazo borrado");

// persistencia
await page.waitForFunction(() => document.querySelector(".saved")?.textContent === "Guardado");
await page.reload();
await page.waitForSelector(".page canvas.ink");
await page.waitForTimeout(1200);
ok((await inkPixels()) === before, "las anotaciones sobreviven a recargar");
ok(await page.getByText("Respuesta: B").isVisible(), "el texto sobrevive a recargar");

// zoom
await page.getByRole("button", { name: "Acercar" }).click();
await page.waitForTimeout(600);
ok((await inkPixels()) > 0, "zoom mantiene las anotaciones");
await page.getByRole("button", { name: "Alejar" }).click();
await page.waitForTimeout(400);

// exportar
const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Exportar/ }).click()]);
await dl.saveAs(`${OUT}/exportado.pdf`);
ok(readFileSync(`${OUT}/exportado.pdf`).length > 1000, "PDF exportado");

// el PDF exportado se importa y se renderiza con las anotaciones incrustadas
await page.goto(BASE);
await page.setInputFiles('[data-testid="file-input"]', `${OUT}/exportado.pdf`);
await page.getByRole("link", { name: /Abrir exportado/ }).click();
await page.waitForSelector(".page canvas.ink");
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/exportado-render.png` });
const stats = await page.evaluate(() => {
  const c = document.querySelector(".page canvas:not(.ink)");
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let yellow = 0, dark = 0;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    if (r > 240 && g > 220 && g < 250 && b < 200) yellow++;
    if (r < 60 && g < 60 && b < 60) dark++;
  }
  return { yellow, dark };
});
ok(stats.yellow > 300, `resaltador incrustado en el PDF exportado (${stats.yellow} px amarillos)`);
ok(stats.dark > 1500, `bolígrafo y texto incrustados (${stats.dark} px oscuros)`);

await page.goto(BASE);
await page.screenshot({ path: `${OUT}/4-biblioteca-con-doc.png` });
ok(errors.length === 0, "sin errores de consola" + (errors.length ? ": " + errors.join(" | ") : ""));

// móvil
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const mp = await mob.newPage();
await mp.goto(BASE);
await mp.setInputFiles('[data-testid="file-input"]', `${OUT}/sample.pdf`);
await mp.waitForSelector(".card");
await mp.screenshot({ path: `${OUT}/5-movil-biblioteca.png` });
await mp.getByRole("link", { name: /Abrir sample/ }).click();
await mp.waitForSelector(".page canvas.ink");
await mp.waitForTimeout(1200);
await mp.screenshot({ path: `${OUT}/6-movil-editor.png` });
ok((await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)), "sin scroll horizontal en móvil");

await browser.close();
