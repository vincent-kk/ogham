import type { MarkdownBlock } from '../markdown-parsing/parse-blocks.js';
import { escapeXml, renderInlineToStorage } from './render-inline.js';

function renderCodeBlock(block: Extract<MarkdownBlock, { type: 'codeBlock' }>): string {
  return `<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">${escapeXml(block.language)}</ac:parameter><ac:plain-text-body><![CDATA[${block.code}]]></ac:plain-text-body></ac:structured-macro>`;
}

function renderTable(block: Extract<MarkdownBlock, { type: 'table' }>): string {
  const rows = block.rows
    .map((cells, index) => {
      const tag = index === 0 ? 'th' : 'td';
      const cellsHtml = cells
        .map((cell) => `<${tag}>${renderInlineToStorage(cell)}</${tag}>`)
        .join('');
      return `<tr>${cellsHtml}</tr>`;
    })
    .join('');

  return `<table><tbody>${rows}</tbody></table>`;
}

export function renderBlocksToStorage(blocks: MarkdownBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'codeBlock':
          return renderCodeBlock(block);
        case 'rule':
          return '<hr />';
        case 'heading':
          return `<h${block.level}>${renderInlineToStorage(block.text)}</h${block.level}>`;
        case 'blockquote':
          return `<blockquote>${block.lines.map((line) => `<p>${renderInlineToStorage(line)}</p>`).join('')}</blockquote>`;
        case 'bulletList':
          return `<ul>${block.items.map((item) => `<li><p>${renderInlineToStorage(item)}</p></li>`).join('')}</ul>`;
        case 'orderedList':
          return `<ol>${block.items.map((item) => `<li><p>${renderInlineToStorage(item)}</p></li>`).join('')}</ol>`;
        case 'table':
          return renderTable(block);
        case 'paragraph':
          return `<p>${renderInlineToStorage(block.text)}</p>`;
      }
    })
    .join('');
}
