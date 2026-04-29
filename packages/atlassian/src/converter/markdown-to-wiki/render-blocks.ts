import type { MarkdownBlock } from '../markdown-parsing/parse-blocks.js';
import { renderInlineToWiki } from './render-inline.js';

function renderTable(rows: string[][]): string {
  return rows
    .map((row, index) => {
      const sep = index === 0 ? '||' : '|';
      const cells = row.map((cell) => renderInlineToWiki(cell)).join(sep);
      return `${sep}${cells}${sep}`;
    })
    .join('\n');
}

function renderBlockquote(lines: string[]): string {
  if (lines.length === 1) return `bq. ${renderInlineToWiki(lines[0])}`;
  const inner = lines.map((line) => renderInlineToWiki(line)).join('\n');
  return `{quote}\n${inner}\n{quote}`;
}

function renderCodeBlock(language: string, code: string): string {
  if (language) return `{code:${language}}\n${code}\n{code}`;
  return `{code}\n${code}\n{code}`;
}

export function renderBlocksToWiki(blocks: MarkdownBlock[]): string[] {
  return blocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return `h${block.level}. ${renderInlineToWiki(block.text)}`;
      case 'paragraph':
        return renderInlineToWiki(block.text);
      case 'codeBlock':
        return renderCodeBlock(block.language, block.code);
      case 'rule':
        return '----';
      case 'blockquote':
        return renderBlockquote(block.lines);
      case 'bulletList':
        return block.items.map((item) => `* ${renderInlineToWiki(item)}`).join('\n');
      case 'orderedList':
        return block.items.map((item) => `# ${renderInlineToWiki(item)}`).join('\n');
      case 'table':
        return renderTable(block.rows);
    }
  });
}
