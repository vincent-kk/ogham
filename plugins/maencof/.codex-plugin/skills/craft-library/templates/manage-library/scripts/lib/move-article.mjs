import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';

import { describeArticle } from './describe-article.mjs';
import { readMetadata } from './read-metadata.mjs';
import { resolveArticlePath } from './resolve-article-path.mjs';
import { syncCatalog } from './sync-catalog.mjs';

/**
 * Move an exact HTML/JSON pair to another topic path and synchronize the catalog.
 * @param {string} libraryRoot absolute library root
 * @param {Record<string, string | string[] | boolean>} options parsed CLI options
 * @returns {ReturnType<typeof describeArticle>} completed operation result
 */
export function moveArticle(libraryRoot, options) {
  const source = resolveArticlePath(libraryRoot, options.article);
  const target = resolveArticlePath(libraryRoot, options.to);
  if (source.relative === target.relative)
    throw new Error('Move target is unchanged');
  if (!existsSync(source.htmlPath) || !existsSync(source.metadataPath)) {
    throw new Error(`Article pair does not exist: ${source.relative}`);
  }
  if (existsSync(target.htmlPath) || existsSync(target.metadataPath)) {
    throw new Error(`Move target already exists: ${target.relative}`);
  }
  const metadata = readMetadata(source.metadataPath);
  mkdirSync(dirname(target.htmlPath), { recursive: true });
  renameSync(source.htmlPath, target.htmlPath);
  try {
    renameSync(source.metadataPath, target.metadataPath);
  } catch (error) {
    renameSync(target.htmlPath, source.htmlPath);
    throw error;
  }
  try {
    syncCatalog(libraryRoot);
  } catch (error) {
    renameSync(target.metadataPath, source.metadataPath);
    renameSync(target.htmlPath, source.htmlPath);
    throw error;
  }
  return describeArticle('moved', target.relative, metadata);
}
