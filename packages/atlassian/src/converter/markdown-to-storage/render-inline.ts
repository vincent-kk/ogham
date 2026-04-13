import { tokenizeInlineMarkdown } from '../markdown-parsing/tokenize-inline.js';

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderInlineToStorage(text: string): string {
  return tokenizeInlineMarkdown(text, { supportImages: true })
    .map((token) => {
      switch (token.type) {
        case 'text':
          return escapeXml(token.text);
        case 'code':
          return `<code>${escapeXml(token.text)}</code>`;
        case 'strong':
          return `<strong>${escapeXml(token.text)}</strong>`;
        case 'strike':
          return `<del>${escapeXml(token.text)}</del>`;
        case 'image':
          return `<ac:image><ri:url ri:value="${escapeXml(token.url)}" /></ac:image>`;
        case 'link':
          return `<a href="${escapeXml(token.href)}">${escapeXml(token.text)}</a>`;
        case 'em':
          return `<em>${escapeXml(token.text)}</em>`;
      }
    })
    .join('');
}
