'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { buildManageUrl, resolveSelector, loadConfig } = require('../src/config');

// Página falsa: imita lo justo de la API de Playwright que usa resolveSelector.
function fakePage(countsBySelector) {
  return {
    locator(selector) {
      if (!(selector in countsBySelector)) {
        throw new Error(`selector inválido: ${selector}`);
      }
      return {
        count: async () => countsBySelector[selector],
        first: () => ({ selector }),
      };
    },
  };
}

test('buildManageUrl sustituye {id} y antepone el baseUrl', () => {
  const url = buildManageUrl('56434986', '/item/{id}/_/manage', 'https://www.revolico.com');
  assert.strictEqual(url, 'https://www.revolico.com/item/56434986/_/manage');
});

test('buildManageUrl acepta un id numérico entregado como número', () => {
  const url = buildManageUrl(56434986, '/item/{id}/_/manage', 'https://www.revolico.com');
  assert.strictEqual(url, 'https://www.revolico.com/item/56434986/_/manage');
});

test('buildManageUrl no duplica la barra final del baseUrl', () => {
  const url = buildManageUrl('123', '/item/{id}/_/manage', 'https://www.revolico.com/');
  assert.strictEqual(url, 'https://www.revolico.com/item/123/_/manage');
});

test('buildManageUrl rechaza ids no numéricos', () => {
  const template = '/item/{id}/_/manage';
  assert.throws(() => buildManageUrl('abc', template, 'https://x.com'), /inválido/);
  assert.throws(() => buildManageUrl('12a', template, 'https://x.com'), /inválido/);
  assert.throws(() => buildManageUrl('', template, 'https://x.com'), /inválido/);
  assert.throws(() => buildManageUrl('../etc', template, 'https://x.com'), /inválido/);
});

test('buildManageUrl exige que la plantilla contenga {id}', () => {
  assert.throws(() => buildManageUrl('123', '/item/manage', 'https://x.com'), /\{id\}/);
});

test('resolveSelector devuelve el primer candidato con resultados', async () => {
  const page = fakePage({ 'button.a': 0, 'button.b': 2, 'button.c': 5 });
  const locator = await resolveSelector(page, ['button.a', 'button.b', 'button.c']);
  assert.ok(locator);
  assert.strictEqual(locator.selector, 'button.b');
});

test('resolveSelector devuelve null si ningún candidato encuentra nada', async () => {
  const page = fakePage({ 'button.a': 0, 'button.b': 0 });
  const locator = await resolveSelector(page, ['button.a', 'button.b']);
  assert.strictEqual(locator, null);
});

test('resolveSelector ignora candidatos que lanzan y sigue con el siguiente', async () => {
  const page = fakePage({ 'button.ok': 1 });
  const locator = await resolveSelector(page, ['selector::roto', 'button.ok']);
  assert.ok(locator);
  assert.strictEqual(locator.selector, 'button.ok');
});

test('resolveSelector tolera una lista de candidatos ausente', async () => {
  const page = fakePage({});
  assert.strictEqual(await resolveSelector(page, undefined), null);
});

test('config.json del repositorio es válido y trae las claves esperadas', () => {
  const config = loadConfig();
  assert.strictEqual(config.baseUrl, 'https://www.revolico.com');
  assert.strictEqual(config.paths.manageTemplate, '/item/{id}/_/manage');
  assert.ok(Array.isArray(config.selectors.renewButton));
  assert.ok(config.selectors.renewButton.length > 0);
  assert.ok(Array.isArray(config.timing.betweenAdsMs));
  assert.ok(config.limits.maxAdsPerRun > 0);
});
