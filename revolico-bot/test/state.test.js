'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readState, writeState, updateAd, emptyState, problematicAds } = require('../src/state');

function tempPath(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'revolico-state-'));
  return path.join(dir, name);
}

test('readState devuelve un estado vacío cuando el archivo no existe', () => {
  const target = tempPath('no-existe.json');
  const result = readState(target);
  assert.deepStrictEqual(result, { ultimaCorrida: null, anuncios: {} });
});

test('readState devuelve un estado vacío si el archivo está corrupto', () => {
  const target = tempPath('corrupto.json');
  fs.writeFileSync(target, '{ esto no es json valido ,,,', 'utf8');
  assert.deepStrictEqual(readState(target), { ultimaCorrida: null, anuncios: {} });
});

test('readState normaliza un JSON válido pero con la forma equivocada', () => {
  const target = tempPath('forma.json');
  fs.writeFileSync(target, '[1,2,3]', 'utf8');
  assert.deepStrictEqual(readState(target), { ultimaCorrida: null, anuncios: {} });
});

test('writeState y readState hacen ida y vuelta correctamente', () => {
  const target = tempPath('estado.json');
  const original = emptyState();
  original.ultimaCorrida = '2026-07-30T12:00:00.000Z';
  original.anuncios['123'] = {
    url: 'https://www.revolico.com/item/123/_/manage',
    titulo: 'Laptop',
    ultimaRenovacion: '2026-07-30T12:00:00.000Z',
    fallosConsecutivos: 0,
    ultimoEstado: 'renovado',
    ultimaVisita: '2026-07-30T12:00:00.000Z',
  };

  assert.strictEqual(writeState(original, target), true);
  assert.deepStrictEqual(readState(target), original);
});

test('updateAd registra la renovación y reinicia el contador de fallos', () => {
  const current = emptyState();
  current.anuncios['5'] = { fallosConsecutivos: 3, ultimaRenovacion: null };

  updateAd(current, '5', {
    url: 'https://www.revolico.com/item/5/_/manage',
    title: 'Bicicleta',
    status: 'renovado',
    timestamp: '2026-07-30T10:00:00.000Z',
  });

  assert.strictEqual(current.anuncios['5'].fallosConsecutivos, 0);
  assert.strictEqual(current.anuncios['5'].ultimaRenovacion, '2026-07-30T10:00:00.000Z');
  assert.strictEqual(current.anuncios['5'].titulo, 'Bicicleta');
});

test('updateAd incrementa los fallos consecutivos ante un error', () => {
  const current = emptyState();
  updateAd(current, '9', { status: 'error', timestamp: 't1' });
  updateAd(current, '9', { status: 'error', timestamp: 't2' });
  assert.strictEqual(current.anuncios['9'].fallosConsecutivos, 2);
});

test('updateAd no cuenta no_elegible como fallo y conserva la última renovación', () => {
  const current = emptyState();
  updateAd(current, '7', { status: 'renovado', timestamp: 't1' });
  updateAd(current, '7', { status: 'no_elegible', timestamp: 't2' });

  assert.strictEqual(current.anuncios['7'].fallosConsecutivos, 0);
  assert.strictEqual(current.anuncios['7'].ultimaRenovacion, 't1');
  assert.strictEqual(current.anuncios['7'].ultimoEstado, 'no_elegible');
});

test('problematicAds lista solo los anuncios que superan el umbral', () => {
  const current = emptyState();
  current.anuncios['1'] = { fallosConsecutivos: 0 };
  current.anuncios['2'] = { fallosConsecutivos: 2 };
  current.anuncios['3'] = { fallosConsecutivos: 5 };

  const problems = problematicAds(current, 2);
  assert.deepStrictEqual(problems.map((ad) => ad.id).sort(), ['2', '3']);
});
