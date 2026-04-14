import type { AdfNode } from '../types/adf-node.js';
import { convertInline } from './convert-inline.js';
import { convertTable } from './convert-table.js';

function convertContent(nodes: AdfNode[]): string {
  return nodes.map(convertInline).join('');
}

export function convertBlock(node: AdfNode, indent: string = ''): string {
  const content = node.content ?? [];

  switch (node.type) {
    case 'paragraph':
      return indent + convertContent(content);
    case 'heading':
      return `${'#'.repeat((node.attrs?.level as number) ?? 1)} ${convertContent(content)}`;
    case 'codeBlock':
      return `\`\`\`${(node.attrs?.language as string) ?? ''}\n${convertContent(content)}\n\`\`\``;
    case 'blockquote': {
      const lines = content.map((child) => convertBlock(child)).join('\n');
      return lines.split('\n').map((line) => `> ${line}`).join('\n');
    }
    case 'bulletList':
      return content
        .map((item) => `${indent}- ${(item.content ?? []).map((child) => convertBlock(child)).join('\n')}`)
        .join('\n');
    case 'orderedList':
      return content
        .map(
          (item, index) =>
            `${indent}${index + 1}. ${(item.content ?? []).map((child) => convertBlock(child)).join('\n')}`,
        )
        .join('\n');
    case 'table':
      return convertTable(content, convertBlock);
    case 'rule':
      return '---';
    case 'listItem':
      return content.map((child) => convertBlock(child)).join('\n');
    case 'mediaSingle':
    case 'mediaGroup': {
      const mediaNodes = content.filter(child => child.type === 'media');
      if (mediaNodes.length === 0) return '[media]';
      return mediaNodes.map(media => {
        const attrs = media.attrs ?? {};
        const fileName = (attrs.fileName as string) ?? (attrs.alt as string);
        const id = (attrs.id as string) ?? '';
        const mediaType = (attrs.type as string) ?? 'file';
        if (!fileName && !id) return '[media]';
        const label = fileName ?? id;
        if (mediaType === 'image') {
          return `![${label}](attachment:${id})`;
        }
        return `[${label}](attachment:${id})`;
      }).join('\n');
    }
    case 'panel': {
      const panelType = (node.attrs?.panelType as string) ?? 'info';
      const body = content.map((child) => convertBlock(child)).join('\n');
      return `> **${panelType}**: ${body}`;
    }
    case 'expand': {
      const title = (node.attrs?.title as string) ?? 'Details';
      const body = content.map((child) => convertBlock(child)).join('\n');
      return `<details>\n<summary>${title}</summary>\n\n${body}\n</details>`;
    }
    default:
      if (content.length > 0) {
        return content.map((child) => convertBlock(child)).join('\n');
      }
      return convertInline(node);
  }
}
