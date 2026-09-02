#!/usr/bin/env node

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLibrary } from './lib/create-library.mjs';
import { resolveCraftTarget } from './lib/resolve-craft-target.mjs';

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIBRARY_TEMPLATE = join(SKILL_ROOT, 'templates', 'library');
const MANAGER_TEMPLATE = join(SKILL_ROOT, 'templates', 'manage-library');

try {
  const { host, vaultRoot } = resolveCraftTarget(process.argv.slice(2));
  const result = createLibrary(
    vaultRoot,
    host,
    LIBRARY_TEMPLATE,
    MANAGER_TEMPLATE,
  );
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
