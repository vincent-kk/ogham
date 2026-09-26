import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

import { describeArticle } from './describe-article.mjs';
import { readMetadata } from './read-metadata.mjs';
import { resolveArticlePath } from './resolve-article-path.mjs';
import { syncCatalog } from './sync-catalog.mjs';

/**
 * Remove an explicitly confirmed article pair and roll back if catalog sync fails.
 * @param {string} libraryRoot absolute library root
 * @param {Record<string, string | string[] | boolean>} options parsed CLI options
 * @returns {ReturnType<typeof describeArticle>} completed operation result
 */
export function removeArticle(libraryRoot, options) {
  if (options.yes !== true)
    throw new Error('remove requires explicit --yes confirmation');
  const pair = resolveArticlePath(libraryRoot, options.article);
  if (!existsSync(pair.htmlPath) || !existsSync(pair.metadataPath)) {
    throw new Error(`Article pair does not exist: ${pair.relative}`);
  }
  const metadata = readMetadata(pair.metadataPath);
  const html = readFileSync(pair.htmlPath);
  const sidecar = readFileSync(pair.metadataPath);
  unlinkSync(pair.htmlPath);
  unlinkSync(pair.metadataPath);
  try {
    syncCatalog(libraryRoot);
  } catch (error) {
    writeFileSync(pair.htmlPath, html);
    writeFileSync(pair.metadataPath, sidecar);
    throw error;
  }
  return describeArticle('removed', pair.relative, metadata);
}
