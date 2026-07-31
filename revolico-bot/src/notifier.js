'use strict';

// Notificaciones por Telegram usando fetch nativo (Node 20+).
// Si faltan credenciales o falla la red, se registra y se sigue: notificar
// nunca debe tumbar el proceso de renovación.

const logger = require('./logger');

const TELEGRAM_API = 'https://api.telegram.org';

function isConfigured() {
  return Boolean(process.env.TELEGRAM_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/** Escapa los caracteres que rompen el parseo Markdown de Telegram. */
function escapeMarkdown(text) {
  return String(text).replace(/([_*`\[\]])/g, '\\$1');
}

/**
 * Envía un mensaje. Devuelve true si se envió, false en cualquier otro caso.
 * Nunca lanza excepción.
 */
async function notify(message) {
  if (!isConfigured()) {
    logger.warn('Telegram no configurado (falta TELEGRAM_TOKEN o TELEGRAM_CHAT_ID): no se notifica.');
    return false;
  }
  const url = `${TELEGRAM_API}/bot${process.env.TELEGRAM_TOKEN}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      // No se registra el cuerpo completo para no filtrar el token en el log.
      logger.warn(`Telegram respondió con estado ${response.status}.`);
      return false;
    }
    return true;
  } catch (err) {
    logger.warn(`No se pudo notificar por Telegram: ${err.message}`);
    return false;
  }
}

/** Arma el resumen de una corrida en Markdown. */
function buildSummary({ renovados, noElegibles, errores, total, problematicos = [] }) {
  const lines = [
    '*Revolico — resumen de la corrida*',
    '',
    `Anuncios procesados: ${total}`,
    `✅ Renovados: ${renovados}`,
    `⏳ Aún no elegibles: ${noElegibles}`,
    `❌ Con error: ${errores}`,
  ];

  if (problematicos.length > 0) {
    lines.push('', '*Anuncios que fallan hace varios ciclos:*');
    for (const ad of problematicos) {
      const label = ad.titulo ? escapeMarkdown(ad.titulo) : `anuncio ${ad.id}`;
      lines.push(`• ${label} — ${ad.fallosConsecutivos} fallos seguidos`);
    }
  }

  return lines.join('\n');
}

module.exports = { isConfigured, notify, buildSummary, escapeMarkdown };
