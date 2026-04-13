/**
 * Markdown → ADF (Atlassian Document Format) converter.
 * Ported from Python: mcp-atlassian/models/jira/adf.py (markdown_to_adf)
 *
 * Line-by-line parser handling: headings, code blocks, blockquotes,
 * bullet/ordered lists, tables, horizontal rules, paragraphs,
 * and inline formatting (bold, italic, code, links, strikethrough).
 */

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

const INLINE_RE = /`([^`]+)`|\*\*(.+?)\*\*|~~(.+?)~~|\[([^\]]+)\]\(([^)]+)\)|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;

function parseInlineFormatting(text: string): AdfNode[] {
  if (!text) return [];

  const nodes: AdfNode[] = [];
  let pos = 0;

  // Reset regex lastIndex for each call
  INLINE_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = INLINE_RE.exec(text)) !== null) {
    // Plain text before this match
    if (match.index > pos) {
      const plain = text.slice(pos, match.index);
      if (plain) nodes.push({ type: 'text', text: plain });
    }

    const [, code, bold, strike, linkText, linkHref, italic] = match;

    if (code !== undefined) {
      nodes.push({ type: 'text', text: code, marks: [{ type: 'code' }] });
    } else if (bold !== undefined) {
      nodes.push({ type: 'text', text: bold, marks: [{ type: 'strong' }] });
    } else if (strike !== undefined) {
      nodes.push({ type: 'text', text: strike, marks: [{ type: 'strike' }] });
    } else if (linkText !== undefined) {
      nodes.push({
        type: 'text',
        text: linkText,
        marks: [{ type: 'link', attrs: { href: linkHref } }],
      });
    } else if (italic !== undefined) {
      nodes.push({ type: 'text', text: italic, marks: [{ type: 'em' }] });
    }

    pos = match.index + match[0].length;
  }

  // Remaining text
  if (pos < text.length) {
    const remaining = text.slice(pos);
    if (remaining) nodes.push({ type: 'text', text: remaining });
  }

  if (nodes.length === 0 && text) {
    nodes.push({ type: 'text', text });
  }

  return nodes;
}

function makeParagraph(text: string): AdfNode {
  const content = parseInlineFormatting(text);
  return {
    type: 'paragraph',
    content: content.length > 0 ? content : [{ type: 'text', text: '' }],
  };
}

function makeListItem(text: string): AdfNode {
  return { type: 'listItem', content: [makeParagraph(text)] };
}

/** Convert Markdown text to an ADF document */
export function markdownToAdf(markdown: string): AdfNode {
  const doc: AdfNode = { type: 'doc', attrs: { version: 1 }, content: [] };
  const content = doc.content!;

  if (!markdown) {
    content.push({ type: 'paragraph', content: [] });
    return doc;
  }

  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      const cb: AdfNode = {
        type: 'codeBlock',
        attrs: lang ? { language: lang } : {},
        content: [{ type: 'text', text: codeLines.join('\n') }],
      };
      content.push(cb);
      continue;
    }

    // Horizontal rule
    const stripped = line.trim();
    if (/^[-*_]{3,}$/.test(stripped) && !line.startsWith('- ') && !line.startsWith('* ')) {
      content.push({ type: 'rule' });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      content.push({
        type: 'heading',
        attrs: { level },
        content: parseInlineFormatting(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      content.push({
        type: 'blockquote',
        content: quoteLines.map((l) => makeParagraph(l)),
      });
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: AdfNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*]\s+/, '');
        items.push(makeListItem(itemText));
        i++;
      }
      content.push({ type: 'bulletList', content: items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: AdfNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s+/, '');
        items.push(makeListItem(itemText));
        i++;
      }
      content.push({ type: 'orderedList', content: items });
      continue;
    }

    // Table
    if (line.startsWith('|') && line.indexOf('|', 1) > 0) {
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableRows.push(lines[i]);
        i++;
      }

      const dataRows: string[][] = [];
      for (const rowLine of tableRows) {
        const cells = rowLine.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        // Skip separator row
        if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
        dataRows.push(cells);
      }

      if (dataRows.length > 0) {
        const adfRows: AdfNode[] = dataRows.map((cells, idx) => {
          const cellType = idx === 0 ? 'tableHeader' : 'tableCell';
          const adfCells: AdfNode[] = cells.map((cellText) => {
            const inlineContent = parseInlineFormatting(cellText);
            return {
              type: cellType,
              content: [{
                type: 'paragraph',
                content: inlineContent.length > 0 ? inlineContent : [{ type: 'text', text: '' }],
              }],
            };
          });
          return { type: 'tableRow', content: adfCells };
        });

        content.push({
          type: 'table',
          attrs: { isNumberColumnEnabled: false, layout: 'default' },
          content: adfRows,
        });
      }
      continue;
    }

    // Empty line
    if (!stripped) {
      i++;
      continue;
    }

    // Paragraph (default)
    content.push(makeParagraph(line));
    i++;
  }

  if (content.length === 0) {
    content.push({ type: 'paragraph', content: [] });
  }

  return doc;
}
