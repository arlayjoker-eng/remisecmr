'use strict';

// Extracción de IDs de anuncios, barajado y delays aleatorios.
// Todo aquí es lógica pura y testeable sin navegador.

/**
 * Dado un array de href y el patrón de config.json, devuelve los IDs numéricos
 * únicos, en el orden en que aparecen. Ignora href basura o sin coincidencia.
 */
function extractIds(hrefs, pattern) {
  if (!Array.isArray(hrefs)) return [];
  const regex = new RegExp(pattern);
  const seen = new Set();
  const ids = [];
  for (const href of hrefs) {
    if (typeof href !== 'string') continue;
    const match = href.match(regex);
    if (!match || !match[1]) continue;
    const id = match[1];
    if (!/^\d+$/.test(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/**
 * Baraja una copia del array (Fisher-Yates). No muta la entrada y preserva
 * todos los elementos: el orden aleatorio hace el patrón menos predecible.
 */
function shuffle(items) {
  const copy = Array.isArray(items) ? items.slice() : [];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Devuelve un entero aleatorio dentro del rango [min, max] configurado.
 * Acepta [min, max]; si el rango viene invertido, lo normaliza.
 */
function randomDelay(range) {
  if (!Array.isArray(range) || range.length < 2) {
    throw new Error('El rango de delay debe ser un array [min, max]');
  }
  const min = Math.min(range[0], range[1]);
  const max = Math.max(range[0], range[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('El rango de delay debe contener números finitos');
  }
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** Pausa la ejecución los milisegundos indicados. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Espera un tiempo aleatorio dentro del rango configurado. */
function sleepRandom(range) {
  return sleep(randomDelay(range));
}

module.exports = { extractIds, shuffle, randomDelay, sleep, sleepRandom };
