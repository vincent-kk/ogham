import type { MarkdownBlock } from '../markdown-parsing/parse-blocks.js';
import type { AdfNode } from '../types/adf-node.js';
import { renderInlineToAdf } from './render-inline.js';

function makeParagraph(text: string): AdfNode {
  const content = renderInlineToAdf(text);
  return {
    type: 'paragraph',
    content: content.length > 0 ? content : [{ type: 'text', text: '' }],
  };
}

function makeListItem(text: string): AdfNode {
  return {
    type: 'listItem',
    content: [makeParagraph(text)],
  };
}

function renderTable(block: Extract<MarkdownBlock, { type: 'table' }>): AdfNode {
  return {
    type: 'table',
    attrs: { isNumberColumnEnabled: false, layout: 'default' },
    content: block.rows.map((cells, index) => {
      const cellType = index === 0 ? 'tableHeader' : 'tableCell';
      return {
        type: 'tableRow',
        content: cells.map((cell) => {
          const inlineContent = renderInlineToAdf(cell);
          return {
            type: cellType,
            content: [{
              type: 'paragraph',
              content: inlineContent.length > 0 ? inlineContent : [{ type: 'text', text: '' }],
            }],
          };
        }),
      };
    }),
  };
}

export function renderBlocksToAdf(blocks: MarkdownBlock[]): AdfNode[] {
  return blocks.map((block): AdfNode => {
    switch (block.type) {
      case 'codeBlock':
        return {
          type: 'codeBlock',
          attrs: block.language ? { language: block.language } : {},
          content: [{ type: 'text', text: block.code }],
        };
      case 'rule':
        return { type: 'rule' };
      case 'heading':
        return {
          type: 'heading',
          attrs: { level: block.level },
          content: renderInlineToAdf(block.text),
        };
      case 'blockquote':
        return {
          type: 'blockquote',
          content: block.lines.map((line) => makeParagraph(line)),
        };
      case 'bulletList':
        return {
          type: 'bulletList',
          content: block.items.map((item) => makeListItem(item)),
        };
      case 'orderedList':
        return {
          type: 'orderedList',
          content: block.items.map((item) => makeListItem(item)),
        };
      case 'table':
        return renderTable(block);
      case 'paragraph':
        return makeParagraph(block.text);
    }
  });
}
