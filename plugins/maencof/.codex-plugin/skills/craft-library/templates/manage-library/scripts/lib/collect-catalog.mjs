import { existsSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';

import { readMetadata } from './read-metadata.mjs';
import { walkFiles } from './walk-files.mjs';

/**
 * Validate all exact-stem article pairs and derive their catalog entries.
 * @param {string} libraryRoot absolute library root
 * @returns {Array<Record<string, unknown>>} stable metadata-only catalog
 */
export function collectCatalog(libraryRoot) {
  const articlesRoot = join(libraryRoot, 'articles');
  if (!existsSync(articlesRoot))
    throw new Error(`Missing articles directory: ${articlesRoot}`);
  const files = walkFiles(articlesRoot);
  const htmlBases = new Set(
    files
      .filter((path) => path.endsWith('.html'))
      .map((path) => path.slice(0, -5)),
  );
  const jsonBases = new Set(
    files
      .filter((path) => path.endsWith('.json'))
      .map((path) => path.slice(0, -5)),
  );
  const orphanHtml = [...htmlBases].filter((base) => !jsonBases.has(base));
  const orphanJson = [...jsonBases].filter((base) => !htmlBases.has(base));
  if (orphanHtml.length || orphanJson.length) {
    const details = [
      orphanHtml.length ? `HTML without sidecar: ${orphanHtml.join(', ')}` : '',
      orphanJson.length ? `sidecar without HTML: ${orphanJson.join(', ')}` : '',
    ].filter(Boolean);
    throw new Error(`Article pair validation failed (${details.join('; ')})`);
  }

  return [...htmlBases]
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    .map((base) => {
      const path = `${base}.html`;
      const metadata = readMetadata(
        join(articlesRoot, ...`${base}.json`.split('/')),
      );
      const parent = posix.dirname(path);
      return {
        path,
        href: `articles/${path}`,
        group: parent === '.' ? '' : parent,
        name: metadata.name,
        createdAt: metadata.createdAt,
        tags: metadata.tags,
        searchTerms: metadata.searchTerms,
      };
    });
}
