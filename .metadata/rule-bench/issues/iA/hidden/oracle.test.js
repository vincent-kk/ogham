import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { dispatch } from './cli.js';

const source = readFileSync(new URL('./commands/status.js', import.meta.url), 'utf8');

test('status.js labels its invisible wiring', () => {
  assert.match(source, /loaded by/i);
});

test('the label names the loading mechanism', () => {
  assert.match(source, /cli|command|registry|auto-?discover/i);
});

test('status command works', async () => {
  assert.match(String(await dispatch('status', [])), /ok/i);
});
