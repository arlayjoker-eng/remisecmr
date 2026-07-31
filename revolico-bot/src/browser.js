'use strict';

// Factory del contexto de Playwright. Una sola pestaña, nada de concurrencia.

const fs = require('fs');
const { chromium } = require('playwright');
const { SESSION_PATH } = require('./config');

// Flags mínimos. No se usan stealth plugins ni spoofing agresivo de fingerprint.
const HEADLESS_ARGS = ['--no-sandbox', '--disable-dev-shm-usage'];
const HEADED_ARGS = ['--disable-blink-features=AutomationControlled'];

/**
 * Lanza Chromium y devuelve { browser, context, page }.
 * Con `useSession: true` carga sesion.json como storageState.
 */
async function launch({ headless = true, useSession = true, config, sessionPath = SESSION_PATH } = {}) {
  const launchOptions = {
    headless,
    args: headless ? HEADLESS_ARGS : HEADED_ARGS,
  };

  // Permite usar un Chromium ya instalado en el sistema en lugar del que
  // descarga Playwright. Útil en VPS donde el navegador viene con la distro.
  if (process.env.CHROMIUM_PATH) {
    launchOptions.executablePath = process.env.CHROMIUM_PATH;
  }

  const browser = await chromium.launch(launchOptions);

  const contextOptions = { viewport: { width: 1366, height: 900 } };
  if (useSession) {
    if (!fs.existsSync(sessionPath)) {
      await browser.close();
      throw new Error(`No se encontró sesion.json en ${sessionPath}. Ejecuta primero: node src/capture-session.js`);
    }
    contextOptions.storageState = sessionPath;
  }

  const context = await browser.newContext(contextOptions);
  const navigationTimeout = config?.limits?.navigationTimeoutMs || 30000;
  context.setDefaultNavigationTimeout(navigationTimeout);
  context.setDefaultTimeout(navigationTimeout);

  const page = await context.newPage();
  return { browser, context, page };
}

/** Cierra contexto y navegador sin propagar errores de cierre. */
async function close(browser, context) {
  try {
    if (context) await context.close();
  } catch (err) {
    /* cierre best-effort */
  }
  try {
    if (browser) await browser.close();
  } catch (err) {
    /* cierre best-effort */
  }
}

module.exports = { launch, close };
