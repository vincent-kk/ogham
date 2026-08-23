#!/usr/bin/env node
/** Keep the shipped skill reference byte-identical to the canonical registry. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderHostConfigurationReference } from '../src/core/hostConfigurationSurfaces/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'skills/.shared/host-configuration.md');
const expected = renderHostConfigurationReference();
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  let actual: string;
  try {
    actual = readFileSync(target, 'utf8');
  } catch {
    throw new Error(
      'Host configuration reference is missing; run yarn host-surfaces:sync.',
    );
  }
  if (actual !== expected)
    throw new Error(
      'Host configuration reference drifted; run yarn host-surfaces:sync and review the diff.',
    );
  console.log('HOST_SURFACES_CHECK_OK');
} else {
  writeFileSync(target, expected, 'utf8');
  console.log('HOST_SURFACES_SYNC_OK');
}
