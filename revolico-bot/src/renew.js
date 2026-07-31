'use strict';

// Proceso principal: renueva los anuncios propios una vez por corrida.
// Pensado para ejecutarse desde cron, como máximo una vez cada 24 horas.
//
// Códigos de salida:
//   0  todo bien (incluye anuncios aún no elegibles y errores sueltos)
//   1  falta sesion.json o config.json, o la sesión expiró
//   2  se detectó un CAPTCHA
//   3  los selectores no encuentran nada (config.json a revisar)

require('dotenv').config();

const fs = require('fs');
const browserFactory = require('./browser');
const logger = require('./logger');
const notifier = require('./notifier');
const state = require('./state');
const { loadConfig, buildManageUrl, resolveSelector, SESSION_PATH, CONFIG_PATH } = require('./config');
const { extractIds, shuffle, sleepRandom } = require('./ads');

const EXIT_OK = 0;
const EXIT_SETUP = 1;
const EXIT_CAPTCHA = 2;
const EXIT_SELECTORS = 3;

/** Aborta con notificación y el código indicado. */
async function abort(message, code) {
  logger.error(message);
  await notifier.notify(`❌ *Revolico — corrida abortada*\n\n${message}`);
  process.exit(code);
}

/** Indica si un locator está deshabilitado por atributo o por clase. */
async function isDisabled(locator) {
  try {
    if (!(await locator.isEnabled())) return true;
  } catch (err) {
    return true;
  }
  try {
    const ariaDisabled = await locator.getAttribute('aria-disabled');
    if (ariaDisabled === 'true') return true;
    const className = (await locator.getAttribute('class')) || '';
    if (/disabled/i.test(className)) return true;
  } catch (err) {
    /* si no se puede leer el atributo, se asume habilitado */
  }
  return false;
}

/**
 * Navega a una URL reintentando UNA sola vez ante timeout.
 * No se reintenta más para no multiplicar visitas al sitio.
 */
async function gotoWithSingleRetry(page, url) {
  try {
    return await page.goto(url, { waitUntil: 'domcontentloaded' });
  } catch (err) {
    logger.warn(`Timeout al abrir ${url}. Se reintenta una única vez.`);
    try {
      return await page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch (retryErr) {
      throw retryErr;
    }
  }
}

/** Intenta extraer un título legible del anuncio para las notificaciones. */
async function readTitle(page) {
  try {
    const heading = page.locator('h1').first();
    if ((await heading.count()) > 0) {
      const text = (await heading.textContent()) || '';
      const clean = text.trim().replace(/\s+/g, ' ');
      if (clean) return clean.slice(0, 120);
    }
    const title = await page.title();
    return title ? title.trim().slice(0, 120) : null;
  } catch (err) {
    return null;
  }
}

/**
 * Procesa un anuncio y devuelve su estado: 'renovado', 'no_elegible', 'error'
 * o 'captcha' (que corta el bucle en el llamador).
 */
async function processAd(page, config, id) {
  const manageUrl = buildManageUrl(id, config.paths.manageTemplate, config.baseUrl);
  logger.info(`Anuncio ${id}: abriendo página de gestión.`);

  let response;
  try {
    response = await gotoWithSingleRetry(page, manageUrl);
  } catch (err) {
    logger.error(`Anuncio ${id}: no se pudo abrir la página de gestión (${err.message}).`);
    return { status: 'error', url: manageUrl, title: null };
  }

  await sleepRandom(config.timing.afterNavigationMs);

  const title = await readTitle(page);

  // La página no cargó bien: 404, redirección al login, o contenido irreconocible.
  if (response && response.status() >= 400) {
    logger.error(`Anuncio ${id}: la página respondió con estado ${response.status()}.`);
    return { status: 'error', url: manageUrl, title };
  }
  if (page.url().includes(config.paths.auth)) {
    logger.error(`Anuncio ${id}: redirigido al login (la sesión pudo expirar durante la corrida).`);
    return { status: 'error', url: manageUrl, title };
  }

  // CAPTCHA: no se resuelve ni se evade. Se corta la corrida.
  const captcha = await resolveSelector(page, config.selectors.captchaIndicator);
  if (captcha) {
    logger.error(`Anuncio ${id}: se detectó un CAPTCHA. Se detiene la corrida.`);
    return { status: 'captcha', url: manageUrl, title };
  }

  // Único punto que depende de un selector CSS.
  let renewButton = null;
  const deadline = Date.now() + (config.limits.renewButtonWaitMs || 8000);
  while (Date.now() < deadline) {
    renewButton = await resolveSelector(page, config.selectors.renewButton);
    if (renewButton) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (!renewButton) {
    const cooldown = await resolveSelector(page, config.selectors.cooldownIndicator);
    if (cooldown) {
      const text = ((await cooldown.textContent().catch(() => '')) || '').trim().replace(/\s+/g, ' ');
      logger.info(`Anuncio ${id}: aún no se puede renovar (${text.slice(0, 120)}).`);
    } else {
      logger.warn(`Anuncio ${id}: no se encontró el botón Renovar ni un texto de espera.`);
    }
    return { status: 'no_elegible', url: manageUrl, title, buttonFound: false };
  }

  if (await isDisabled(renewButton)) {
    logger.info(`Anuncio ${id}: el botón Renovar está deshabilitado, aún no cumple las 24 h. No se clickea.`);
    return { status: 'no_elegible', url: manageUrl, title, buttonFound: true };
  }

  try {
    await renewButton.click();
  } catch (err) {
    logger.error(`Anuncio ${id}: falló el click en Renovar (${err.message}).`);
    return { status: 'error', url: manageUrl, title, buttonFound: true };
  }

  await sleepRandom(config.timing.afterClickMs);

  // Paso de confirmación opcional: no todas las páginas lo tienen.
  const confirmButton = await resolveSelector(page, config.selectors.confirmButton);
  if (confirmButton) {
    try {
      await confirmButton.click();
      await sleepRandom(config.timing.afterClickMs);
    } catch (err) {
      logger.warn(`Anuncio ${id}: no se pudo clickear el botón de confirmación (${err.message}).`);
    }
  }

  const success = await resolveSelector(page, config.selectors.successIndicator);
  if (success) {
    logger.info(`Anuncio ${id}: renovado correctamente.`);
    return { status: 'renovado', url: manageUrl, title, buttonFound: true };
  }

  // Se clickeó pero no hay confirmación visible. Se cuenta como renovado y se
  // deja constancia: marcarlo como error dispararía alarmas falsas.
  logger.warn(`Anuncio ${id}: se clickeó Renovar pero no se detectó mensaje de éxito.`);
  return { status: 'renovado', url: manageUrl, title, buttonFound: true, unconfirmed: true };
}

async function main() {
  logger.info('=== Inicio de la corrida ===');

  if (!fs.existsSync(CONFIG_PATH)) {
    await abort(`No se encontró config.json en ${CONFIG_PATH}.`, EXIT_SETUP);
  }
  if (!fs.existsSync(SESSION_PATH)) {
    await abort(
      `No se encontró sesion.json en ${SESSION_PATH}. Genera la sesión con: node src/capture-session.js`,
      EXIT_SETUP
    );
  }

  let config;
  try {
    config = loadConfig();
  } catch (err) {
    await abort(err.message, EXIT_SETUP);
  }

  const runState = state.readState();
  const timestamp = new Date().toISOString();
  const results = { renovado: 0, no_elegible: 0, error: 0 };
  let exitCode = EXIT_OK;
  let captchaDetected = false;
  let anyButtonFound = false;
  let processed = 0;

  const { browser, context, page } = await browserFactory.launch({
    headless: true,
    useSession: true,
    config,
  });

  try {
    const accountUrl = `${config.baseUrl}${config.paths.account}`;
    logger.info(`Abriendo ${accountUrl}`);

    try {
      await gotoWithSingleRetry(page, accountUrl);
    } catch (err) {
      logger.error(`No se pudo abrir /account: ${err.message}`);
      await browserFactory.close(browser, context);
      await abort('No se pudo abrir la página de la cuenta. Revisa la conexión del VPS.', EXIT_SETUP);
    }

    await sleepRandom(config.timing.afterNavigationMs);

    // Sesión expirada: se detecta por redirección o por ausencia del indicador.
    const loginIndicator = await resolveSelector(page, config.selectors.loginIndicator);
    if (page.url().includes(config.paths.auth) || !loginIndicator) {
      await browserFactory.close(browser, context);
      await abort(
        'La sesión expiró. Regenera sesion.json en tu computadora con `node src/capture-session.js` y súbelo al VPS.',
        EXIT_SETUP
      );
    }

    const hrefs = await page.$$eval('a[href]', (els) => els.map((el) => el.getAttribute('href')));
    let ids = extractIds(hrefs, config.adIdPattern);

    if (ids.length === 0) {
      await browserFactory.close(browser, context);
      await abort(
        'No se extrajo ningún ID de anuncio desde /account. Revisa "adIdPattern" en config.json.',
        EXIT_SELECTORS
      );
    }

    logger.info(`Anuncios detectados: ${ids.length}`);

    ids = shuffle(ids).slice(0, config.limits.maxAdsPerRun || 25);
    logger.info(`Se procesarán ${ids.length} anuncios en orden aleatorio.`);

    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      const result = await processAd(page, config, id);
      processed += 1;

      if (result.buttonFound) anyButtonFound = true;

      if (result.status === 'captcha') {
        captchaDetected = true;
        state.updateAd(runState, id, {
          url: result.url,
          title: result.title,
          status: 'error',
          timestamp,
        });
        results.error += 1;
        break;
      }

      results[result.status] += 1;
      state.updateAd(runState, id, {
        url: result.url,
        title: result.title,
        status: result.status,
        timestamp,
      });

      if (i < ids.length - 1) {
        await sleepRandom(config.timing.betweenAdsMs);
      }
    }

    // Rotación de cookies: se re-guarda la sesión para alargar su vida útil.
    try {
      await context.storageState({ path: SESSION_PATH });
      logger.info('Sesión re-guardada tras la corrida.');
    } catch (err) {
      logger.warn(`No se pudo re-guardar la sesión: ${err.message}`);
    }
  } finally {
    await browserFactory.close(browser, context);
  }

  runState.ultimaCorrida = timestamp;
  if (!state.writeState(runState)) {
    logger.warn('No se pudo escribir estado.json.');
  }

  const problematicos = state.problematicAds(runState);

  if (captchaDetected) {
    logger.error('Corrida detenida por CAPTCHA. Estado parcial guardado.');
    await notifier.notify(
      '🛑 *Revolico — CAPTCHA detectado*\n\n' +
        'La corrida se detuvo al encontrar un CAPTCHA. No se intenta resolverlo.\n' +
        `Anuncios procesados antes de detenerse: ${processed}.\n` +
        'Entra manualmente al sitio y vuelve a intentarlo en la próxima corrida.'
    );
    process.exit(EXIT_CAPTCHA);
  }

  // Si ningún anuncio mostró el botón, lo más probable es que el selector se rompió.
  if (!anyButtonFound && processed > 0) {
    logger.error('El botón Renovar no apareció en NINGÚN anuncio.');
    await notifier.notify(
      '⚠️ *Revolico — selector roto*\n\n' +
        'El botón "Renovar" no apareció en ningún anuncio de la corrida.\n' +
        'Es probable que el DOM de Revolico haya cambiado.\n' +
        'Ejecuta `node src/discover.js` y actualiza "renewButton" en config.json.'
    );
    process.exit(EXIT_SELECTORS);
  }

  const summary = notifier.buildSummary({
    renovados: results.renovado,
    noElegibles: results.no_elegible,
    errores: results.error,
    total: processed,
    problematicos,
  });

  logger.info(
    `Resumen: ${results.renovado} renovados, ${results.no_elegible} no elegibles, ${results.error} con error.`
  );
  await notifier.notify(summary);
  logger.info('=== Fin de la corrida ===');

  process.exit(exitCode);
}

main().catch(async (err) => {
  logger.error(`Error inesperado: ${err.message}`);
  await notifier.notify(`❌ *Revolico — error inesperado*\n\n${err.message}`);
  process.exit(1);
});
