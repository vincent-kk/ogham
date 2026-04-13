/**
 * Markdown → Confluence Storage Format (XHTML) converter.
 * Line-by-line regex parser following the same pattern as markdown-to-adf.ts.
 */

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const INLINE_RE =
  /`([^`]+)`|\*\*(.+?)\*\*|~~(.+?)~~|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;

function parseInline(text: string): string {
  if (!text) return '';

  let result = '';
  let pos = 0;

  INLINE_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > pos) {
      result += escapeXml(text.slice(pos, match.index));
    }

    const [, code, bold, strike, imgAlt, imgUrl, linkText, linkHref, italic] = match;

    if (code !== undefined) {
      result += `<code>${escapeXml(code)}</code>`;
    } else if (bold !== undefined) {
      result += `<strong>${escapeXml(bold)}</strong>`;
    } else if (strike !== undefined) {
      result += `<del>${escapeXml(strike)}</del>`;
    } else if (imgAlt !== undefined) {
      result += `<ac:image><ri:url ri:value="${escapeXml(imgUrl!)}" /></ac:image>`;
    } else if (linkText !== undefined) {
      result += `<a href="${escapeXml(linkHref!)}">${escapeXml(linkText)}</a>`;
    } else if (italic !== undefined) {
      result += `<em>${escapeXml(italic)}</em>`;
    }

    pos = match.index + match[0].length;
  }

  if (pos < text.length) {
    result += escapeXml(text.slice(pos));
  }

  return result;
}

/** Convert Markdown to Confluence Storage Format XHTML */
export function markdownToStorage(markdown: string): string {
  if (!markdown || !markdown.trim()) return '';

  const lines = markdown.split('\n');
  const parts: string[] = [];
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
      parts.push(
        `<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">${escapeXml(lang)}</ac:parameter><ac:plain-text-body><![CDATA[${codeLines.join('\n')}]]></ac:plain-text-body></ac:structured-macro>`,
      );
      continue;
    }

    const stripped = line.trim();

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(stripped) && !line.startsWith('- ') && !line.startsWith('* ')) {
      parts.push('<hr />');
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      parts.push(`<h${level}>${parseInline(headingMatch[2])}</h${level}>`);
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
      const inner = quoteLines.map((l) => `<p>${parseInline(l)}</p>`).join('');
      parts.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*]\s+/, '');
        items.push(`<li><p>${parseInline(itemText)}</p></li>`);
        i++;
      }
      parts.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s+/, '');
        items.push(`<li><p>${parseInline(itemText)}</p></li>`);
        i++;
      }
      parts.push(`<ol>${items.join('')}</ol>`);
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
        const cells = rowLine
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim());
        // Skip separator row
        if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
        dataRows.push(cells);
      }

      if (dataRows.length > 0) {
        const rows = dataRows
          .map((cells, idx) => {
            const tag = idx === 0 ? 'th' : 'td';
            const cellsHtml = cells.map((c) => `<${tag}>${parseInline(c)}</${tag}>`).join('');
            return `<tr>${cellsHtml}</tr>`;
          })
          .join('');
        parts.push(`<table><tbody>${rows}</tbody></table>`);
      }
      continue;
    }

    // Empty line
    if (!stripped) {
      i++;
      continue;
    }

    // Paragraph (default)
    parts.push(`<p>${parseInline(line)}</p>`);
    i++;
  }

  return parts.join('');
}
