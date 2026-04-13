/**
 * Markdown → Confluence Storage Format (XHTML) converter.
 * Uses unified + remark-parse to parse Markdown AST, then custom visitor to emit Storage Format.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, Content, PhrasingContent, Text, InlineCode, Strong, Emphasis, Delete, Link, Image, Heading, Paragraph, Blockquote, List, ListItem, Code, Table, TableRow, TableCell, Html } from 'mdast';

type MdastNode = Root | Content;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function convertInline(node: PhrasingContent): string {
  switch (node.type) {
    case 'text':
      return escapeXml((node as Text).value);

    case 'inlineCode':
      return `<code>${escapeXml((node as InlineCode).value)}</code>`;

    case 'strong':
      return `<strong>${(node as Strong).children.map(convertInline).join('')}</strong>`;

    case 'emphasis':
      return `<em>${(node as Emphasis).children.map(convertInline).join('')}</em>`;

    case 'delete':
      return `<del>${(node as Delete).children.map(convertInline).join('')}</del>`;

    case 'link': {
      const link = node as Link;
      const children = link.children.map(convertInline).join('');
      return `<a href="${escapeXml(link.url)}">${children}</a>`;
    }

    case 'image': {
      const img = node as Image;
      return `<ac:image><ri:url ri:value="${escapeXml(img.url)}" /></ac:image>`;
    }

    case 'break':
      return '<br />';

    case 'html':
      return (node as Html).value;

    default:
      return '';
  }
}

function convertBlock(node: MdastNode): string {
  switch (node.type) {
    case 'root':
      return (node as Root).children.map(convertBlock).join('');

    case 'heading': {
      const h = node as Heading;
      const tag = `h${h.depth}`;
      const content = h.children.map(convertInline).join('');
      return `<${tag}>${content}</${tag}>`;
    }

    case 'paragraph': {
      const p = node as Paragraph;
      const content = p.children.map(convertInline).join('');
      return `<p>${content}</p>`;
    }

    case 'blockquote': {
      const bq = node as Blockquote;
      const content = bq.children.map(convertBlock).join('');
      return `<blockquote>${content}</blockquote>`;
    }

    case 'list': {
      const list = node as List;
      const tag = list.ordered ? 'ol' : 'ul';
      const items = list.children.map(convertBlock).join('');
      return `<${tag}>${items}</${tag}>`;
    }

    case 'listItem': {
      const li = node as ListItem;
      const content = li.children.map(convertBlock).join('');
      return `<li>${content}</li>`;
    }

    case 'code': {
      const code = node as Code;
      return `<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">${escapeXml(code.lang ?? '')}</ac:parameter><ac:plain-text-body><![CDATA[${code.value}]]></ac:plain-text-body></ac:structured-macro>`;
    }

    case 'thematicBreak':
      return '<hr />';

    case 'table': {
      const table = node as Table;
      const rows = table.children.map((row, idx) => {
        const tr = row as TableRow;
        const cells = tr.children.map((cell) => {
          const tc = cell as TableCell;
          const tag = idx === 0 ? 'th' : 'td';
          const content = tc.children.map(convertInline).join('');
          return `<${tag}>${content}</${tag}>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><tbody>${rows}</tbody></table>`;
    }

    case 'html':
      return (node as Html).value;

    default:
      return '';
  }
}

/** Convert Markdown to Confluence Storage Format XHTML */
export function markdownToStorage(markdown: string): string {
  if (!markdown || !markdown.trim()) return '';

  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(markdown);

  return convertBlock(tree);
}
