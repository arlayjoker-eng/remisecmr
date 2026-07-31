'use strict';

// Carga de config.json y helpers que dependen de la configuración.
// Los selectores CSS nunca se escriben aquí: viven en config.json.

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'config.json');
const SESSION_PATH = path.join(ROOT_DIR, 'sesion.json');

/**
 * Lee y parsea config.json. Lanza con un mensaje claro en español si falta o
 * está mal formado, para que el proceso principal pueda abortar con exit 1.
 */
function loadConfig(configPath = CONFIG_PATH) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`No se encontró config.json en ${configPath}`);
  }
  let raw;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (err) {
    throw new Error(`No se pudo leer config.json: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`config.json tiene JSON inválido: ${err.message}`);
  }
}

/**
 * Construye la URL de gestión de un anuncio sustituyendo {id} en la plantilla.
 * Es el único lugar donde se arma esa URL: no concatenar strings por el código.
 * Rechaza cualquier id que no sea estrictamente numérico.
 */
function buildManageUrl(id, template, baseUrl) {
  const value = String(id);
  if (!/^\d+$/.test(value)) {
    throw new Error(`ID de anuncio inválido (debe ser numérico): ${JSON.stringify(id)}`);
  }
  if (typeof template !== 'string' || !template.includes('{id}')) {
    throw new Error('manageTemplate debe ser un string que contenga el marcador {id}');
  }
  const pathPart = template.replace('{id}', value);
  if (!baseUrl) return pathPart;
  return `${String(baseUrl).replace(/\/+$/, '')}${pathPart}`;
}

/**
 * Prueba una lista de selectores candidatos en orden y devuelve el primer
 * locator que encuentre al menos un elemento, o null si ninguno funciona.
 * Así un cambio de DOM en Revolico se absorbe agregando candidatos a config.json.
 */
async function resolveSelector(page, candidates) {
  if (!Array.isArray(candidates)) return null;
  for (const candidate of candidates) {
    try {
      const locator = page.locator(candidate);
      const count = await locator.count();
      if (count > 0) return locator.first();
    } catch (err) {
      // Un selector inválido no debe tumbar el proceso: se prueba el siguiente.
    }
  }
  return null;
}

module.exports = {
  ROOT_DIR,
  CONFIG_PATH,
  SESSION_PATH,
  loadConfig,
  buildManageUrl,
  resolveSelector,
};
