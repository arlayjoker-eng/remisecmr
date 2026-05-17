// Génère les icônes PWA depuis public/cmr-logo.png — logo CMR centré sur fond blanc.
import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

async function gen(size, out) {
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;
  const logo = await sharp("public/cmr-logo.png")
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logo, top: pad, left: pad }])
    .png()
    .toFile(out);
  console.log("OK", out);
}

await Promise.all([
  gen(192, "public/icons/icon-192.png"),
  gen(512, "public/icons/icon-512.png"),
  gen(180, "public/icons/apple-touch-icon.png"),
]);
