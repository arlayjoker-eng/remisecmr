'use strict';

// Mapeo del DOM real de Revolico.
//
// Este script existe porque el DOM de Revolico no está documentado. Vuelca el
// HTML y una captura de /account y de la primera página de gestión, y luego
// imprime un reporte legible para poder confirmar el selector del botón
// "Renovar" en config.json sin ser experto en DOM.

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const browserFactory = require('./browser');
const { loadConfig, buildManageUrl, resolveSelector, ROOT_DIR } = require('./config');
const { extractIds, sleepRandom } = require('./ads');

const DISCOVERY_DIR = path.join(ROOT_DIR, 'discovery');
const KEYWORDS = ['renovar', 'renovación', 'renovacion', 'actualizar', 'horas', 'disponible'];

/** Guarda HTML y captura completa de la página con un prefijo dado. */
async function dumpPage(page, prefix) {
  fs.mkdirSync(DISCOVERY_DIR, { recursive: true });
  const htmlPath = path.join(DISCOVERY_DIR, `${prefix}.html`);
  const pngPath = path.join(DISCOVERY_DIR, `${prefix}.png`);
  fs.writeFileSync(htmlPath, await page.content(), 'utf8');
  await page.screenshot({ path: pngPath, fullPage: true });
  console.log(`   Guardado: ${htmlPath}`);
  console.log(`   Guardado: ${pngPath}`);
}

/** Recolecta datos de botones, enlaces y textos relevantes dentro de la página. */
function collectReport(keywords) {
  const describe = (el) => {
    const dataAttrs = {};
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-')) dataAttrs[attr.name] = attr.value;
    }
    const disabled =
      el.hasAttribute('disabled') ||
      el.getAttribute('aria-disabled') === 'true' ||
      /disabled/i.test(el.className || '');
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
      className: (el.className || '').toString().slice(0, 160),
      id: el.id || '',
      href: el.getAttribute('href') || '',
      type: el.getAttribute('type') || '',
      dataAttrs,
      disabled,
    };
  };

  const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(describe);
  const links = Array.from(document.querySelectorAll('a')).map(describe);

  const matches = [];
  const all = Array.from(document.querySelectorAll('body *'));
  for (const el of all) {
    // Solo el elemento más profundo que contiene el texto, para no repetir ancestros.
    if (el.children.length > 0) continue;
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (!text) continue;
    const lower = text.toLowerCase();
    if (keywords.some((kw) => lower.includes(kw))) {
      matches.push({ ...describe(el), text: text.slice(0, 200) });
    }
  }

  return { buttons, links, matches };
}

function printElements(title, items, { showHref = false } = {}) {
  console.log('');
  console.log(`--- ${title} (${items.length}) ---`);
  if (items.length === 0) {
    console.log('   (ninguno)');
    return;
  }
  items.forEach((item, index) => {
    const parts = [`[${index + 1}] <${item.tag}>`];
    if (item.text) parts.push(`texto: "${item.text}"`);
    if (item.id) parts.push(`id: ${item.id}`);
    if (item.className) parts.push(`clases: ${item.className}`);
    if (showHref && item.href) parts.push(`href: ${item.href}`);
    const dataKeys = Object.keys(item.dataAttrs || {});
    if (dataKeys.length) {
      parts.push(`data: ${dataKeys.map((k) => `${k}="${item.dataAttrs[k]}"`).join(' ')}`);
    }
    parts.push(item.disabled ? 'ESTADO: DESHABILITADO' : 'ESTADO: habilitado');
    console.log(`   ${parts.join(' | ')}`);
  });
}

async function main() {
  const config = loadConfig();
  const accountUrl = `${config.baseUrl}${config.paths.account}`;

  console.log('');
  console.log('=== Mapeo del DOM de Revolico ===');
  console.log('');

  const { browser, context, page } = await browserFactory.launch({
    headless: false,
    useSession: true,
    config,
  });

  try {
    console.log(`1) Abriendo ${accountUrl} ...`);
    await page.goto(accountUrl, { waitUntil: 'domcontentloaded' });
    await sleepRandom(config.timing.afterNavigationMs);

    if (page.url().includes(config.paths.auth)) {
      console.error('❌ Fuiste redirigido al login: la sesión expiró.');
      console.error('   Regenera sesion.json con: node src/capture-session.js');
      process.exitCode = 1;
      return;
    }

    await dumpPage(page, '01-account');

    const hrefs = await page.$$eval('a[href]', (els) => els.map((el) => el.getAttribute('href')));
    const ids = extractIds(hrefs, config.adIdPattern);

    console.log('');
    console.log(`2) IDs de anuncios encontrados con el patrón ${config.adIdPattern}: ${ids.length}`);
    ids.forEach((id) => console.log(`   • ${id} → ${buildManageUrl(id, config.paths.manageTemplate, config.baseUrl)}`));

    if (ids.length === 0) {
      console.error('');
      console.error('❌ No se extrajo ningún ID de anuncio.');
      console.error('   Revisa "adIdPattern" en config.json y el HTML guardado en discovery/01-account.html');
      process.exitCode = 3;
      return;
    }

    const firstId = ids[0];
    const manageUrl = buildManageUrl(firstId, config.paths.manageTemplate, config.baseUrl);
    console.log('');
    console.log(`3) Abriendo la página de gestión del anuncio ${firstId}:`);
    console.log(`   ${manageUrl}`);
    await page.goto(manageUrl, { waitUntil: 'domcontentloaded' });
    await sleepRandom(config.timing.afterNavigationMs);
    await dumpPage(page, '02-manage');

    const report = await page.evaluate(collectReport, KEYWORDS);

    printElements('BOTONES en la página de gestión', report.buttons);
    printElements('ENLACES en la página de gestión', report.links, { showHref: true });
    printElements('TEXTOS relevantes (Renovar / Actualizar / horas / disponible)', report.matches);

    // Diagnóstico directo del selector que realmente importa.
    console.log('');
    console.log('--- Diagnóstico del botón Renovar ---');
    const renewLocator = await resolveSelector(page, config.selectors.renewButton);
    if (!renewLocator) {
      console.log('   ⚠️  Ningún candidato de "renewButton" de config.json encontró el botón.');
      console.log('   Mira la lista de BOTONES de arriba y agrega el selector correcto a config.json.');
    } else {
      let enabled = false;
      try {
        enabled = await renewLocator.isEnabled();
      } catch (err) {
        enabled = false;
      }
      const text = (await renewLocator.textContent().catch(() => '')) || '';
      console.log(`   ✅ Encontrado. Texto: "${text.trim()}"`);
      console.log(`   Estado: ${enabled ? 'HABILITADO (se puede renovar ahora)' : 'DESHABILITADO (aún en espera)'}`);
    }

    const cooldown = await resolveSelector(page, config.selectors.cooldownIndicator);
    if (cooldown) {
      const text = (await cooldown.textContent().catch(() => '')) || '';
      console.log(`   Texto de espera detectado: "${text.trim().slice(0, 200)}"`);
    } else {
      console.log('   No se detectó texto de espera con los candidatos de "cooldownIndicator".');
    }

    const captcha = await resolveSelector(page, config.selectors.captchaIndicator);
    if (captcha) {
      console.log('   ⚠️  Se detectó lo que parece un CAPTCHA en esta página.');
    }

    console.log('');
    console.log('Listo. Revisa el reporte de arriba y ajusta "renewButton" en config.json si hace falta.');
    console.log(`Los volcados quedaron en: ${DISCOVERY_DIR}`);
    console.log('');
  } finally {
    await browserFactory.close(browser, context);
  }
}

main().catch((err) => {
  console.error(`❌ Error inesperado: ${err.message}`);
  process.exit(1);
});
