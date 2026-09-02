import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { collectCatalog } from './collect-catalog.mjs';
import { serializeCatalog } from './serialize-catalog.mjs';

/**
 * Atomically rebuild the derived catalog after every pair validates.
 * @param {string} libraryRoot absolute library root
 * @returns {Array<Record<string, unknown>>} entries written to the catalog
 */
export function syncCatalog(libraryRoot) {
  const entries = collectCatalog(libraryRoot);
  const scriptsRoot = join(libraryRoot, 'scripts');
  const catalogPath = join(scriptsRoot, 'catalog.generated.js');
  const temporaryPath = join(scriptsRoot, `.catalog.${process.pid}.tmp`);
  mkdirSync(scriptsRoot, { recursive: true });
  try {
    writeFileSync(temporaryPath, serializeCatalog(entries), 'utf8');
    renameSync(temporaryPath, catalogPath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
  return entries;
}
