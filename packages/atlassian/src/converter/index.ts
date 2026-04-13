import type { ConvertFormat } from '../types/index.js';
import { adfToMarkdown } from './adf-to-markdown.js';
import { markdownToAdf } from './markdown-to-adf.js';
import { storageToMarkdown } from './storage-to-markdown.js';
import { markdownToStorage } from './markdown-to-storage.js';

export { adfToMarkdown } from './adf-to-markdown.js';
export { markdownToAdf } from './markdown-to-adf.js';
export { storageToMarkdown } from './storage-to-markdown.js';
export { markdownToStorage } from './markdown-to-storage.js';

/** Unified conversion function: convert between supported formats */
export function convert(
  from: ConvertFormat,
  to: ConvertFormat,
  content: string,
): string {
  if (from === to) return content;

  const key = `${from}->${to}`;

  switch (key) {
    case 'adf->markdown':
      return adfToMarkdown(JSON.parse(content)) ?? '';

    case 'markdown->adf':
      return JSON.stringify(markdownToAdf(content));

    case 'storage->markdown':
      return storageToMarkdown(content);

    case 'markdown->storage':
      return markdownToStorage(content);

    case 'adf->storage': {
      const md = adfToMarkdown(JSON.parse(content)) ?? '';
      return markdownToStorage(md);
    }

    case 'storage->adf': {
      const md = storageToMarkdown(content);
      return JSON.stringify(markdownToAdf(md));
    }

    default:
      throw new Error(`Unsupported conversion: ${from} → ${to}`);
  }
}
