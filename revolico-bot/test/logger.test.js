'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { timestamp, rotateIfNeeded, MAX_LOG_BYTES } = require('../src/logger');

test('timestamp usa la zona horaria de La Habana con formato estable', () => {
  // 2026-07-30T16:00:00Z equivale a las 12:00 en La Habana (UTC-4 en verano).
  const value = timestamp(new Date('2026-07-30T16:00:00Z'));
  assert.match(value, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.strictEqual(value, '2026-07-30 12:00:00');
});

test('rotateIfNeeded no hace nada si el log no supera el máximo', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'revolico-log-'));
  const logPath = path.join(dir, 'renovar.log');
  const rotatedPath = path.join(dir, 'renovar.log.1');
  fs.writeFileSync(logPath, 'linea corta\n', 'utf8');

  rotateIfNeeded(logPath, rotatedPath);

  assert.ok(fs.existsSync(logPath));
  assert.ok(!fs.existsSync(rotatedPath));
});

test('rotateIfNeeded renombra el log cuando supera los 5 MB', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'revolico-log-'));
  const logPath = path.join(dir, 'renovar.log');
  const rotatedPath = path.join(dir, 'renovar.log.1');
  fs.writeFileSync(logPath, Buffer.alloc(MAX_LOG_BYTES + 1, 0x61));

  rotateIfNeeded(logPath, rotatedPath);

  assert.ok(!fs.existsSync(logPath), 'el log original debe haberse renombrado');
  assert.ok(fs.existsSync(rotatedPath), 'debe existir renovar.log.1');
});

test('rotateIfNeeded no lanza si el archivo no existe', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'revolico-log-'));
  assert.doesNotThrow(() => rotateIfNeeded(path.join(dir, 'nada.log'), path.join(dir, 'nada.log.1')));
});
