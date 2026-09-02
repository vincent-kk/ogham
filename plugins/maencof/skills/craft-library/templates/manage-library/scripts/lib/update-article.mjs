import {
  copyFileSync,
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

import { describeArticle } from './describe-article.mjs';
import { readMetadata } from './read-metadata.mjs';
import { resolveArticlePath } from './resolve-article-path.mjs';
import { syncCatalog } from './sync-catalog.mjs';
import { writeMetadata } from './write-metadata.mjs';

/**
 * Patch an article pair while preserving its creation time and source artifact.
 * @param {string} libraryRoot absolute library root
 * @param {Record<string, string | string[] | boolean>} options parsed CLI options
 * @returns {ReturnType<typeof describeArticle>} completed operation result
 */
export function updateArticle(libraryRoot, options) {
  if (options['created-at'] !== undefined) {
    throw new Error('createdAt is immutable after add');
  }
  if (options['clear-tags'] && options.tag.length) {
    throw new Error('--clear-tags cannot be combined with --tag');
  }
  if (options['clear-search-terms'] && options['search-term'].length) {
    throw new Error(
      '--clear-search-terms cannot be combined with --search-term',
    );
  }
  const pair = resolveArticlePath(libraryRoot, options.article);
  if (!existsSync(pair.htmlPath) || !existsSync(pair.metadataPath)) {
    throw new Error(`Article pair does not exist: ${pair.relative}`);
  }
  const previous = readMetadata(pair.metadataPath);
  const sourcePath =
    typeof options.source === 'string' ? resolve(options.source) : undefined;
  if (
    sourcePath &&
    (!existsSync(sourcePath) || !statSync(sourcePath).isFile())
  ) {
    throw new Error(`Source HTML is not a file: ${sourcePath}`);
  }
  const next = {
    ...previous,
    name: typeof options.name === 'string' ? options.name : previous.name,
    tags: options['clear-tags']
      ? []
      : options.tag.length
        ? options.tag
        : previous.tags,
    searchTerms: options['clear-search-terms']
      ? []
      : options['search-term'].length
        ? options['search-term']
        : previous.searchTerms,
  };
  const previousHtml = readFileSync(pair.htmlPath);
  const previousJson = readFileSync(pair.metadataPath);
  try {
    if (sourcePath) copyFileSync(sourcePath, pair.htmlPath);
    const metadata = writeMetadata(pair.metadataPath, next);
    syncCatalog(libraryRoot);
    return describeArticle('updated', pair.relative, metadata);
  } catch (error) {
    writeFileSync(pair.htmlPath, previousHtml);
    writeFileSync(pair.metadataPath, previousJson);
    throw error;
  }
}
