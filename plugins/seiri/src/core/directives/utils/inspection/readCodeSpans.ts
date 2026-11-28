import { removeFencedBlocks } from './utils/removeFencedBlocks.js';

/**
 * Read the inline code spans of a Markdown document.
 * @param markdown Document body.
 * @returns The content of each span in order, duplicates kept. Fenced blocks hold no spans. A span opens with a run of backticks and closes at the next run of exactly that length; its content loses one padding space at each end when both ends have one and it is not all spaces, and a table-escaped pipe becomes a pipe.
 */
export function readCodeSpans(markdown: string): string[] {
  const text = removeFencedBlocks(markdown);
  const spans: string[] = [];
  let position = 0;
  while (position < text.length) {
    if (text[position] !== '`') {
      position += 1;
      continue;
    }
    const length = runLength(text, position);
    const close = findClosingRun(text, position + length, length);
    if (close === undefined) {
      position += length;
      continue;
    }
    spans.push(normalizeSpan(text.slice(position + length, close)));
    position = close + length;
  }
  return spans;
}

/** Number of consecutive backticks that start at the position. */
function runLength(text: string, start: number): number {
  let end = start;
  while (text[end] === '`') end += 1;
  return end - start;
}

/** Index of the first run of exactly `length` backticks at or after `from`, or undefined. */
function findClosingRun(
  text: string,
  from: number,
  length: number,
): number | undefined {
  for (let at = text.indexOf('`', from); at !== -1;) {
    const run = runLength(text, at);
    if (run === length) return at;
    at = text.indexOf('`', at + run);
  }
  return undefined;
}

/** Apply the padding and table-escape rules to the raw content of a span. */
function normalizeSpan(content: string): string {
  const padded =
    content.startsWith(' ') && content.endsWith(' ') && content.trim() !== '';
  return (padded ? content.slice(1, -1) : content).replaceAll('\\|', '|');
}
