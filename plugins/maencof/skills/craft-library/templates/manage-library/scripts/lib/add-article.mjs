import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describeArticle } from './describe-article.mjs';
import { resolveArticlePath } from './resolve-article-path.mjs';
import { syncCatalog } from './sync-catalog.mjs';
import { validateMetadata } from './validate-metadata.mjs';
import { writeMetadata } from './write-metadata.mjs';

/**
 * Copy an external HTML artifact, write its sidecar, and synchronize the catalog.
 * @param {string} libraryRoot absolute library root
 * @param {Record<string, string | string[] | boolean>} options parsed CLI options
 * @returns {ReturnType<typeof describeArticle>} completed operation result
 */
export function addArticle(libraryRoot, options) {
  if (typeof options.source !== 'string')
    throw new Error('--source is required');
  if (typeof options.name !== 'string') throw new Error('--name is required');
  const sourcePath = resolve(options.source);
  if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) {
    throw new Error(`Source HTML is not a file: ${sourcePath}`);
  }
  const pair = resolveArticlePath(libraryRoot, options.article);
  if (existsSync(pair.htmlPath) || existsSync(pair.metadataPath)) {
    throw new Error(`Article pair already exists: ${pair.relative}`);
  }
  const metadata = validateMetadata({
    schemaVersion: 1,
    name: options.name,
    createdAt:
      typeof options['created-at'] === 'string'
        ? options['created-at']
        : new Date().toISOString(),
    tags: options.tag,
    searchTerms: options['search-term'],
  });

  mkdirSync(dirname(pair.htmlPath), { recursive: true });
  try {
    copyFileSync(sourcePath, pair.htmlPath);
    writeMetadata(pair.metadataPath, metadata);
    syncCatalog(libraryRoot);
  } catch (error) {
    rmSync(pair.htmlPath, { force: true });
    rmSync(pair.metadataPath, { force: true });
    throw error;
  }
  return describeArticle('added', pair.relative, metadata);
}
