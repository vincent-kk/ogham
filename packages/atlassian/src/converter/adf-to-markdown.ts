/**
 * ADF (Atlassian Document Format) → Markdown converter.
 * Ported from Python: mcp-atlassian/models/jira/adf.py (adf_to_text)
 *
 * Supports 17 node types: text, hardBreak, mention, emoji, date, status,
 * inlineCard, codeBlock, paragraph, heading, bulletList, orderedList,
 * blockquote, table, rule, listItem, marks (strong, em, code, link, strike).
 */

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

function applyMarks(text: string, marks?: AdfNode['marks']): string {
  if (!marks || marks.length === 0) return text;
  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'strong': result = `**${result}**`; break;
      case 'em': result = `*${result}*`; break;
      case 'code': result = `\`${result}\``; break;
      case 'strike': result = `~~${result}~~`; break;
      case 'link': {
        const href = (mark.attrs?.href as string) ?? '';
        result = `[${result}](${href})`;
        break;
      }
    }
  }
  return result;
}

function convertInline(node: AdfNode): string {
  switch (node.type) {
    case 'text':
      return applyMarks(node.text ?? '', node.marks);

    case 'hardBreak':
      return '\n';

    case 'mention': {
      const attrs = node.attrs ?? {};
      return (attrs.text as string) ?? `@${(attrs.id as string) ?? 'unknown'}`;
    }

    case 'emoji': {
      const attrs = node.attrs ?? {};
      return (attrs.text as string) ?? (attrs.shortName as string) ?? '';
    }

    case 'date': {
      const timestamp = node.attrs?.timestamp;
      if (timestamp) {
        try {
          const dt = new Date(Number(timestamp));
          return dt.toISOString().slice(0, 10);
        } catch {
          return String(timestamp);
        }
      }
      return '';
    }

    case 'status': {
      const attrs = node.attrs ?? {};
      return `[${(attrs.text as string) ?? ''}]`;
    }

    case 'inlineCard': {
      const attrs = node.attrs ?? {};
      const url = attrs.url as string;
      if (url) return url;
      const data = attrs.data as Record<string, unknown> | undefined;
      return (data?.url as string) ?? (data?.name as string) ?? '';
    }

    default:
      return '';
  }
}

function convertContent(nodes: AdfNode[]): string {
  return nodes.map(convertInline).join('');
}

function convertBlock(node: AdfNode, indent: string = ''): string {
  const content = node.content ?? [];

  switch (node.type) {
    case 'paragraph':
      return indent + convertContent(content);

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1;
      const prefix = '#'.repeat(level);
      return `${prefix} ${convertContent(content)}`;
    }

    case 'codeBlock': {
      const lang = (node.attrs?.language as string) ?? '';
      const code = convertContent(content);
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }

    case 'blockquote': {
      const lines = content.map((child) => convertBlock(child)).join('\n');
      return lines.split('\n').map((line) => `> ${line}`).join('\n');
    }

    case 'bulletList':
      return content.map((item) => {
        const itemContent = (item.content ?? [])
          .map((child) => convertBlock(child))
          .join('\n');
        return `${indent}- ${itemContent}`;
      }).join('\n');

    case 'orderedList':
      return content.map((item, idx) => {
        const itemContent = (item.content ?? [])
          .map((child) => convertBlock(child))
          .join('\n');
        return `${indent}${idx + 1}. ${itemContent}`;
      }).join('\n');

    case 'table':
      return convertTable(content);

    case 'rule':
      return '---';

    case 'listItem':
      return content.map((child) => convertBlock(child)).join('\n');

    case 'mediaSingle':
    case 'mediaGroup':
      return '[media]';

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
      // Recurse for unknown container nodes
      if (content.length > 0) {
        return content.map((child) => convertBlock(child)).join('\n');
      }
      return convertInline(node);
  }
}

function convertTable(rows: AdfNode[]): string {
  if (rows.length === 0) return '';

  const result: string[][] = [];

  for (const row of rows) {
    const cells = (row.content ?? []).map((cell) => {
      const cellContent = (cell.content ?? [])
        .map((child) => convertBlock(child))
        .join(' ');
      return cellContent;
    });
    result.push(cells);
  }

  if (result.length === 0) return '';

  // Calculate column widths
  const colCount = Math.max(...result.map((r) => r.length));
  const lines: string[] = [];

  // Header row
  lines.push('| ' + result[0].map((c) => c || ' ').join(' | ') + ' |');
  // Separator
  lines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |');
  // Data rows
  for (let i = 1; i < result.length; i++) {
    const row = result[i];
    while (row.length < colCount) row.push('');
    lines.push('| ' + row.join(' | ') + ' |');
  }

  return lines.join('\n');
}

/** Convert an ADF document or node to Markdown */
export function adfToMarkdown(adf: unknown): string | null {
  if (adf === null || adf === undefined) return null;
  if (typeof adf === 'string') return adf;

  if (Array.isArray(adf)) {
    const texts = (adf as AdfNode[])
      .map((item) => convertBlock(item))
      .filter(Boolean);
    return texts.length > 0 ? texts.join('\n\n') : null;
  }

  const node = adf as AdfNode;

  // If it's a doc node, process its content
  if (node.type === 'doc' && node.content) {
    const blocks = node.content.map((child) => convertBlock(child)).filter(Boolean);
    return blocks.length > 0 ? blocks.join('\n\n') : null;
  }

  // Single node
  const result = convertBlock(node);
  return result || null;
}
