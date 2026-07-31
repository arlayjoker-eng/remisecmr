'use strict';

// Log a stdout y a renovar.log, con rotación al superar 5 MB.
// Nunca se registran cookies, tokens ni contenido de la sesión.

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const LOG_PATH = path.join(ROOT_DIR, 'renovar.log');
const ROTATED_PATH = path.join(ROOT_DIR, 'renovar.log.1');
const MAX_LOG_BYTES = 5 * 1024 * 1024;

/** Marca de tiempo legible en la zona horaria de Cuba. */
function timestamp(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('es-CU', {
    timeZone: 'America/Havana',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = {};
  for (const part of formatter.formatToParts(date)) parts[part.type] = part.value;
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

/** Si el log supera el máximo, lo renombra y empieza uno nuevo. */
function rotateIfNeeded(logPath = LOG_PATH, rotatedPath = ROTATED_PATH) {
  try {
    if (!fs.existsSync(logPath)) return;
    const { size } = fs.statSync(logPath);
    if (size <= MAX_LOG_BYTES) return;
    fs.renameSync(logPath, rotatedPath);
  } catch (err) {
    // Un fallo de rotación no debe interrumpir el proceso principal.
  }
}

function write(level, message) {
  const line = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);

  try {
    rotateIfNeeded();
    fs.appendFileSync(LOG_PATH, `${line}\n`, 'utf8');
  } catch (err) {
    // Si el disco falla, al menos queda el mensaje en stdout.
  }
}

module.exports = {
  LOG_PATH,
  MAX_LOG_BYTES,
  timestamp,
  rotateIfNeeded,
  info: (message) => write('info', message),
  warn: (message) => write('warn', message),
  error: (message) => write('error', message),
};
