import { closeSync, openSync, readSync, statSync } from 'node:fs';

import { cleanHtmlText } from './clean-html-text.mjs';
import { parseTagAttributes } from './parse-tag-attributes.mjs';

const MAX_INPUT_BYTES = 131_072;
const MAX_HEADINGS = 8;

/**
 * Read only a fixed prefix and return structural metadata suitable for an LLM.
 * @param {string | undefined} sourcePath absolute or working-directory-relative HTML file
 * @returns {{title: string, description: string, keywords: string[], headings: string[], bytesInspected: number}} bounded digest
 */
export function inspectHtml(sourcePath) {
  if (!sourcePath) throw new Error('--source is required');
  const bytesToRead = Math.min(statSync(sourcePath).size, MAX_INPUT_BYTES);
  const buffer = Buffer.alloc(bytesToRead);
  const descriptor = openSync(sourcePath, 'r');
  let bytesRead;
  try {
    bytesRead = readSync(descriptor, buffer, 0, bytesToRead, 0);
  } finally {
    closeSync(descriptor);
  }
  const html = buffer.subarray(0, bytesRead).toString('utf8');
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]{0,2048}?)<\/title>/i);
  const headings = [
    ...html.matchAll(/<h[12]\b[^>]*>([\s\S]{0,2048}?)<\/h[12]>/gi),
  ]
    .slice(0, MAX_HEADINGS)
    .map((match) => cleanHtmlText(match[1], 64))
    .filter(Boolean);
  let description = '';
  let keywords = [];
  for (const match of html.matchAll(/<meta\b[^>]{0,2048}>/gi)) {
    const attributes = parseTagAttributes(match[0]);
    const name = (attributes.name || '').toLocaleLowerCase();
    if (name === 'description')
      description = cleanHtmlText(attributes.content || '', 320);
    if (name === 'keywords') {
      keywords = (attributes.content || '')
        .split(',')
        .map((value) => cleanHtmlText(value, 32))
        .filter(Boolean)
        .slice(0, 12);
    }
  }
  return {
    title: cleanHtmlText(titleMatch?.[1] || '', 160),
    description,
    keywords,
    headings,
    bytesInspected: bytesRead,
  };
}
