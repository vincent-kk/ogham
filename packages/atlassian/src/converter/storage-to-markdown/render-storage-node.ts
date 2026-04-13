import type { HtmlNode } from './html-node.js';
import { renderStorageTable } from './render-storage-table.js';

export function renderStorageNode(node: HtmlNode): string {
  if (typeof node === 'string') return node;

  const inner = node.children.map(renderStorageNode).join('');
  const { tag, attrs } = node;

  switch (tag) {
    case 'h1':
      return `# ${inner.trim()}\n\n`;
    case 'h2':
      return `## ${inner.trim()}\n\n`;
    case 'h3':
      return `### ${inner.trim()}\n\n`;
    case 'h4':
      return `#### ${inner.trim()}\n\n`;
    case 'h5':
      return `##### ${inner.trim()}\n\n`;
    case 'h6':
      return `###### ${inner.trim()}\n\n`;
    case 'p':
      return `${inner.trim()}\n\n`;
    case 'br':
      return '\n';
    case 'hr':
      return '---\n\n';
    case 'strong':
    case 'b':
      return `**${inner}**`;
    case 'em':
    case 'i':
      return `*${inner}*`;
    case 'code':
      return `\`${inner}\``;
    case 'del':
    case 's':
      return `~~${inner}~~`;
    case 'a':
      return attrs.href ? `[${inner}](${attrs.href})` : inner;
    case 'img':
      return `![${attrs.alt ?? ''}](${attrs.src ?? ''})`;
    case 'ul': {
      const items = node.children
        .filter((child): child is Exclude<HtmlNode, string> => typeof child !== 'string' && child.tag === 'li')
        .map((child) => `- ${renderStorageNode(child).trim()}`)
        .join('\n');
      return `${items}\n\n`;
    }
    case 'ol': {
      const items = node.children
        .filter((child): child is Exclude<HtmlNode, string> => typeof child !== 'string' && child.tag === 'li')
        .map((child, index) => `${index + 1}. ${renderStorageNode(child).trim()}`)
        .join('\n');
      return `${items}\n\n`;
    }
    case 'li':
      return inner.trim();
    case 'blockquote':
      return `${inner.trim().split('\n').map((line) => `> ${line}`).join('\n')}\n\n`;
    case 'pre': {
      const codeChild = node.children.find(
        (child): child is Exclude<HtmlNode, string> => typeof child !== 'string' && child.tag === 'code',
      );
      const codeText = codeChild ? renderStorageNode(codeChild).replace(/^`|`$/g, '') : inner;
      return `\`\`\`\n${codeText}\n\`\`\`\n\n`;
    }
    case 'table':
      return renderStorageTable(node, renderStorageNode);
    case 'ac:structured-macro': {
      const macroName = attrs['ac:name'] ?? 'macro';
      return `> [${macroName}]: ${inner.trim()}\n\n`;
    }
    case 'ac:rich-text-body':
    case 'ac:plain-text-body':
    case 'ac:parameter':
    case 'ri:url':
    case 'tbody':
    case 'thead':
    case 'div':
    case 'span':
      return inner;
    default:
      return inner;
  }
}
