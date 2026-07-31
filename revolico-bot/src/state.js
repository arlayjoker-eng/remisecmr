'use strict';

// Estado persistente entre corridas (estado.json).
// Sirve para detectar anuncios que llevan varios ciclos fallando.

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const STATE_PATH = path.join(ROOT_DIR, 'estado.json');

function emptyState() {
  return { ultimaCorrida: null, anuncios: {} };
}

/**
 * Lee estado.json. Si no existe o está corrupto, devuelve un estado vacío
 * en lugar de fallar: perder el histórico no debe impedir una corrida.
 */
function readState(statePath = STATE_PATH) {
  try {
    if (!fs.existsSync(statePath)) return emptyState();
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyState();
    return {
      ultimaCorrida: parsed.ultimaCorrida || null,
      anuncios: parsed.anuncios && typeof parsed.anuncios === 'object' ? parsed.anuncios : {},
    };
  } catch (err) {
    return emptyState();
  }
}

/** Escribe estado.json de forma legible. Devuelve true si se pudo guardar. */
function writeState(state, statePath = STATE_PATH) {
  try {
    fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Actualiza la entrada de un anuncio según el resultado de la corrida.
 * `renovado` reinicia el contador de fallos; `error` lo incrementa;
 * `no_elegible` es esperado (cooldown de 24 h) y no cuenta como fallo.
 */
function updateAd(state, id, { url, title, status, timestamp }) {
  const previous = state.anuncios[id] || { fallosConsecutivos: 0, ultimaRenovacion: null };
  const entry = {
    url: url || previous.url || null,
    titulo: title || previous.titulo || null,
    ultimaRenovacion: previous.ultimaRenovacion || null,
    fallosConsecutivos: previous.fallosConsecutivos || 0,
    ultimoEstado: status,
    ultimaVisita: timestamp,
  };

  if (status === 'renovado') {
    entry.ultimaRenovacion = timestamp;
    entry.fallosConsecutivos = 0;
  } else if (status === 'error') {
    entry.fallosConsecutivos = (previous.fallosConsecutivos || 0) + 1;
  }

  state.anuncios[id] = entry;
  return state;
}

/** Anuncios con al menos `threshold` fallos consecutivos, para destacar en la notificación. */
function problematicAds(state, threshold = 2) {
  return Object.entries(state.anuncios || {})
    .filter(([, entry]) => (entry.fallosConsecutivos || 0) >= threshold)
    .map(([id, entry]) => ({ id, ...entry }));
}

module.exports = { STATE_PATH, emptyState, readState, writeState, updateAd, problematicAds };
