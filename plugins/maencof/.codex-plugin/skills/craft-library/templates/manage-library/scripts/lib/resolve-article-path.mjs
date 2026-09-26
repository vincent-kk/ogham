import { isAbsolute, join, posix, resolve, sep } from 'node:path';

/**
 * Confine an HTML article path to the library articles directory.
 * @param {string} libraryRoot absolute library root
 * @param {string | undefined} requested caller-provided relative HTML path
 * @returns {{relative: string, htmlPath: string, metadataPath: string}} paired paths
 */
export function resolveArticlePath(libraryRoot, requested) {
  if (!requested) throw new Error('--article is required');
  const slashPath = requested.replaceAll('\\', '/');
  if (isAbsolute(requested) || posix.isAbsolute(slashPath)) {
    throw new Error('--article must be relative to library/articles');
  }
  const relative = posix.normalize(slashPath);
  if (
    relative === '.' ||
    relative.startsWith('../') ||
    relative.includes('/../')
  ) {
    throw new Error('--article cannot leave library/articles');
  }
  if (!relative.endsWith('.html'))
    throw new Error('--article must end in .html');

  const articlesRoot = resolve(libraryRoot, 'articles');
  const htmlPath = resolve(articlesRoot, ...relative.split('/'));
  if (
    htmlPath !== articlesRoot &&
    !htmlPath.startsWith(`${articlesRoot}${sep}`)
  ) {
    throw new Error('--article cannot leave library/articles');
  }
  return {
    relative,
    htmlPath,
    metadataPath: join(htmlPath.slice(0, -'.html'.length) + '.json'),
  };
}
