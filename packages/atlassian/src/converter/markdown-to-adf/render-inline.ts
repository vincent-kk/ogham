import type { AdfNode } from '../types/adf-node.js';
import { tokenizeInlineMarkdown } from '../markdown-parsing/tokenize-inline.js';

function makeMarkedText(
  text: string,
  mark: NonNullable<AdfNode['marks']>[number],
): AdfNode {
  return { type: 'text', text, marks: [mark] };
}

export function renderInlineToAdf(text: string): AdfNode[] {
  const nodes = tokenizeInlineMarkdown(text)
    .map((token): AdfNode => {
      switch (token.type) {
        case 'text':
          return { type: 'text', text: token.text };
        case 'code':
          return makeMarkedText(token.text, { type: 'code' });
        case 'strong':
          return makeMarkedText(token.text, { type: 'strong' });
        case 'strike':
          return makeMarkedText(token.text, { type: 'strike' });
        case 'link':
          return makeMarkedText(token.text, {
            type: 'link',
            attrs: { href: token.href },
          });
        case 'em':
          return makeMarkedText(token.text, { type: 'em' });
        case 'image':
          return { type: 'text', text: `![${token.alt}](${token.url})` };
      }
    })
    .filter((node) => node.text !== undefined && node.text !== '');

  if (nodes.length > 0) return nodes;
  return text ? [{ type: 'text', text }] : [];
}
