import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { collectCatalog } from './collect-catalog.mjs';
import { serializeCatalog } from './serialize-catalog.mjs';

/**
 * Verify pair/schema integrity and exact catalog synchronization without writes.
 * @param {string} libraryRoot absolute library root
 * @returns {{operation: string, articleCount: number, synchronized: true}} verification result
 */
export function verifyLibrary(libraryRoot) {
  const entries = collectCatalog(libraryRoot);
  const catalogPath = join(libraryRoot, 'scripts', 'catalog.generated.js');
  const actual = readFileSync(catalogPath, 'utf8');
  if (actual !== serializeCatalog(entries)) {
    throw new Error('Catalog is stale; run manage-library sync');
  }
  return {
    operation: 'verified',
    articleCount: entries.length,
    synchronized: true,
  };
}
