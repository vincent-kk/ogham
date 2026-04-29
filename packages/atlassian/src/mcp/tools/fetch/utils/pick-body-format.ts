import { markdownToAdf, markdownToStorage, markdownToWiki } from '../../../../converter/index.js';

export type BodyFormat = 'adf' | 'storage' | 'wiki';

/** Decide the wire body format from the resolved service + API version. */
export function pickBodyFormat(
  service: 'jira' | 'confluence',
  apiVersion: '2' | '3',
): BodyFormat {
  if (service === 'confluence') return 'storage';
  return apiVersion === '3' ? 'adf' : 'wiki';
}

/** Render a markdown string into the body format selected by `pickBodyFormat`. */
export function renderByFormat(md: string, fmt: BodyFormat): unknown {
  if (fmt === 'adf') return markdownToAdf(md);
  if (fmt === 'storage') {
    return { storage: { value: markdownToStorage(md), representation: 'storage' } };
  }
  return markdownToWiki(md);
}
