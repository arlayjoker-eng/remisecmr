'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { notify, isConfigured, buildSummary, escapeMarkdown } = require('../src/notifier');

test('isConfigured es falso cuando faltan las credenciales de Telegram', () => {
  const previous = { token: process.env.TELEGRAM_TOKEN, chat: process.env.TELEGRAM_CHAT_ID };
  delete process.env.TELEGRAM_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;

  try {
    assert.strictEqual(isConfigured(), false);
  } finally {
    if (previous.token) process.env.TELEGRAM_TOKEN = previous.token;
    if (previous.chat) process.env.TELEGRAM_CHAT_ID = previous.chat;
  }
});

test('notify no lanza excepción sin credenciales y devuelve false', async () => {
  const previous = { token: process.env.TELEGRAM_TOKEN, chat: process.env.TELEGRAM_CHAT_ID };
  delete process.env.TELEGRAM_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;

  try {
    const sent = await notify('mensaje de prueba');
    assert.strictEqual(sent, false);
  } finally {
    if (previous.token) process.env.TELEGRAM_TOKEN = previous.token;
    if (previous.chat) process.env.TELEGRAM_CHAT_ID = previous.chat;
  }
});

test('buildSummary incluye los contadores de la corrida', () => {
  const summary = buildSummary({ renovados: 3, noElegibles: 2, errores: 1, total: 6 });
  assert.match(summary, /Anuncios procesados: 6/);
  assert.match(summary, /Renovados: 3/);
  assert.match(summary, /Aún no elegibles: 2/);
  assert.match(summary, /Con error: 1/);
});

test('buildSummary destaca los anuncios que fallan hace varios ciclos', () => {
  const summary = buildSummary({
    renovados: 0,
    noElegibles: 0,
    errores: 1,
    total: 1,
    problematicos: [{ id: '42', titulo: 'Laptop usada', fallosConsecutivos: 3 }],
  });
  assert.match(summary, /Laptop usada/);
  assert.match(summary, /3 fallos seguidos/);
});

test('buildSummary omite la sección de problemas cuando no hay ninguno', () => {
  const summary = buildSummary({ renovados: 1, noElegibles: 0, errores: 0, total: 1 });
  assert.doesNotMatch(summary, /fallan hace varios ciclos/);
});

test('escapeMarkdown neutraliza los caracteres que rompen el formato', () => {
  assert.strictEqual(escapeMarkdown('precio *bajo* _hoy_'), 'precio \\*bajo\\* \\_hoy\\_');
});
