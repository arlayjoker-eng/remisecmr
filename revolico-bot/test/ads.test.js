'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { extractIds, shuffle, randomDelay } = require('../src/ads');

const PATTERN = '/item/(\\d+)';

test('extractIds devuelve los IDs numéricos en orden de aparición', () => {
  const hrefs = ['/item/56434986/_/detalle', '/item/123/algo'];
  assert.deepStrictEqual(extractIds(hrefs, PATTERN), ['56434986', '123']);
});

test('extractIds deduplica IDs repetidos', () => {
  const hrefs = ['/item/111/a', '/item/111/b', 'https://www.revolico.com/item/111/_/manage', '/item/222/c'];
  assert.deepStrictEqual(extractIds(hrefs, PATTERN), ['111', '222']);
});

test('extractIds ignora href sin coincidencia o basura', () => {
  const hrefs = ['/account', '/item/abc/x', null, undefined, 42, '', '/item/777/ok'];
  assert.deepStrictEqual(extractIds(hrefs, PATTERN), ['777']);
});

test('extractIds funciona con URLs absolutas', () => {
  const hrefs = ['https://www.revolico.com/item/999/_/manage'];
  assert.deepStrictEqual(extractIds(hrefs, PATTERN), ['999']);
});

test('extractIds devuelve un array vacío si no hay entrada válida', () => {
  assert.deepStrictEqual(extractIds([], PATTERN), []);
  assert.deepStrictEqual(extractIds(null, PATTERN), []);
});

test('shuffle preserva todos los elementos y no muta el original', () => {
  const original = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const copy = original.slice();
  const mixed = shuffle(original);
  assert.strictEqual(mixed.length, original.length);
  assert.deepStrictEqual(mixed.slice().sort(), original.slice().sort());
  assert.deepStrictEqual(original, copy, 'shuffle no debe mutar el array de entrada');
});

test('shuffle tolera arrays vacíos o entradas no válidas', () => {
  assert.deepStrictEqual(shuffle([]), []);
  assert.deepStrictEqual(shuffle(null), []);
});

test('randomDelay siempre cae dentro del rango configurado', () => {
  for (let i = 0; i < 500; i += 1) {
    const value = randomDelay([8000, 20000]);
    assert.ok(value >= 8000 && value <= 20000, `valor fuera de rango: ${value}`);
    assert.ok(Number.isInteger(value));
  }
});

test('randomDelay soporta un rango de un solo valor', () => {
  assert.strictEqual(randomDelay([1000, 1000]), 1000);
});

test('randomDelay normaliza un rango invertido', () => {
  const value = randomDelay([5000, 1000]);
  assert.ok(value >= 1000 && value <= 5000);
});

test('randomDelay rechaza rangos mal formados', () => {
  assert.throws(() => randomDelay([1000]), /\[min, max\]/);
  assert.throws(() => randomDelay(null), /\[min, max\]/);
  assert.throws(() => randomDelay(['a', 'b']), /finitos/);
});
