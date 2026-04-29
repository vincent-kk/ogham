import { markdownToAdf, markdownToStorage, markdownToWiki } from '../../../../converter/index.js';
import type { BodyFormat } from './pick-body-format.js';

/** Render a markdown string into the body format selected by `pickBodyFormat`. */
export function renderByFormat(md: string, fmt: BodyFormat): unknown {
  if (fmt === 'adf') return markdownToAdf(md);
  if (fmt === 'storage') {
    return { storage: { value: markdownToStorage(md), representation: 'storage' } };
  }
  return markdownToWiki(md);
}
