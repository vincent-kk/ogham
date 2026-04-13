/**
 * Confluence Storage Format (XHTML) → Markdown converter.
 * Uses a simple recursive tag-based parser instead of a full XML parser,
 * since Storage Format is well-structured XHTML with predictable patterns.
 */

interface HtmlElement {
  tag: string;
  attrs: Record<string, string>;
  children: Array<HtmlElement | string>;
}

/** Parse a simple HTML/XHTML string into an element tree */
function parseHtml(html: string): Array<HtmlElement | string> {
  const results: Array<HtmlElement | string> = [];
  let pos = 0;

  while (pos < html.length) {
    const tagStart = html.indexOf('<', pos);

    if (tagStart === -1) {
      // Rest is text
      const text = html.slice(pos);
      if (text) results.push(text);
      break;
    }

    // Text before tag
    if (tagStart > pos) {
      const text = html.slice(pos, tagStart);
      if (text) results.push(text);
    }

    // Self-closing or CDATA or comment?
    if (html.startsWith('<!--', tagStart)) {
      const end = html.indexOf('-->', tagStart);
      pos = end === -1 ? html.length : end + 3;
      continue;
    }

    if (html.startsWith('<![CDATA[', tagStart)) {
      const end = html.indexOf(']]>', tagStart);
      if (end !== -1) {
        results.push(html.slice(tagStart + 9, end));
        pos = end + 3;
      } else {
        pos = html.length;
      }
      continue;
    }

    // Closing tag?
    if (html[tagStart + 1] === '/') {
      const tagEnd = html.indexOf('>', tagStart);
      pos = tagEnd === -1 ? html.length : tagEnd + 1;
      // Return — closing tag handled by caller
      break;
    }

    // Opening tag
    const tagEnd = html.indexOf('>', tagStart);
    if (tagEnd === -1) { pos = html.length; break; }

    const tagContent = html.slice(tagStart + 1, tagEnd);
    const selfClosing = tagContent.endsWith('/');
    const cleanContent = selfClosing ? tagContent.slice(0, -1).trim() : tagContent.trim();

    // Parse tag name and attributes
    const spaceIdx = cleanContent.search(/\s/);
    const tagName = spaceIdx === -1 ? cleanContent : cleanContent.slice(0, spaceIdx);
    const attrStr = spaceIdx === -1 ? '' : cleanContent.slice(spaceIdx);

    const attrs: Record<string, string> = {};
    const attrRe = /([\w:.-]+)\s*=\s*"([^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(attrStr)) !== null) {
      attrs[m[1]] = m[2];
    }

    const elem: HtmlElement = { tag: tagName, attrs, children: [] };

    if (!selfClosing) {
      // Parse children until matching closing tag
      pos = tagEnd + 1;
      const closeTag = `</${tagName}>`;

      // For void elements, don't look for children
      if (['br', 'hr', 'img'].includes(tagName)) {
        results.push(elem);
        continue;
      }

      // Recursively parse children
      let depth = 1;
      let childStart = pos;

      // Find matching close tag (handle nesting)
      let searchPos = pos;
      while (depth > 0 && searchPos < html.length) {
        const nextOpen = html.indexOf(`<${tagName}`, searchPos);
        const nextClose = html.indexOf(closeTag, searchPos);

        if (nextClose === -1) { searchPos = html.length; break; }

        if (nextOpen !== -1 && nextOpen < nextClose) {
          // Check it's actually an opening tag (not a prefix match like <table vs <tbody)
          const charAfter = html[nextOpen + tagName.length + 1];
          if (charAfter === '>' || charAfter === ' ' || charAfter === '/') {
            depth++;
          }
          searchPos = nextOpen + 1;
        } else {
          depth--;
          if (depth === 0) {
            const innerHtml = html.slice(childStart, nextClose);
            elem.children = parseHtml(innerHtml);
            pos = nextClose + closeTag.length;
          } else {
            searchPos = nextClose + 1;
          }
        }
      }

      if (depth > 0) {
        // Unclosed tag — treat remaining as children
        elem.children = parseHtml(html.slice(childStart));
        pos = html.length;
      }
    } else {
      pos = tagEnd + 1;
    }

    results.push(elem);
  }

  return results;
}

function walkElement(node: HtmlElement | string): string {
  if (typeof node === 'string') return node;

  const inner = node.children.map(walkElement).join('');
  const { tag, attrs } = node;

  switch (tag) {
    case 'h1': return `# ${inner.trim()}\n\n`;
    case 'h2': return `## ${inner.trim()}\n\n`;
    case 'h3': return `### ${inner.trim()}\n\n`;
    case 'h4': return `#### ${inner.trim()}\n\n`;
    case 'h5': return `##### ${inner.trim()}\n\n`;
    case 'h6': return `###### ${inner.trim()}\n\n`;

    case 'p': return `${inner.trim()}\n\n`;
    case 'br': return '\n';
    case 'hr': return '---\n\n';

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
        .filter((c): c is HtmlElement => typeof c !== 'string' && c.tag === 'li')
        .map((c) => `- ${walkElement(c).trim()}`)
        .join('\n');
      return items + '\n\n';
    }

    case 'ol': {
      const items = node.children
        .filter((c): c is HtmlElement => typeof c !== 'string' && c.tag === 'li')
        .map((c, i) => `${i + 1}. ${walkElement(c).trim()}`)
        .join('\n');
      return items + '\n\n';
    }

    case 'li':
      return inner.trim();

    case 'blockquote':
      return inner.trim().split('\n').map((l) => `> ${l}`).join('\n') + '\n\n';

    case 'pre': {
      const codeChild = node.children.find(
        (c): c is HtmlElement => typeof c !== 'string' && c.tag === 'code',
      );
      const codeText = codeChild ? walkElement(codeChild).replace(/^`|`$/g, '') : inner;
      return `\`\`\`\n${codeText}\n\`\`\`\n\n`;
    }

    case 'table':
      return convertTable(node);

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

function convertTable(tableNode: HtmlElement): string {
  const rows: string[][] = [];

  function collectRows(children: Array<HtmlElement | string>) {
    for (const child of children) {
      if (typeof child === 'string') continue;
      if (child.tag === 'tr') {
        const cells = child.children
          .filter((c): c is HtmlElement => typeof c !== 'string' && (c.tag === 'td' || c.tag === 'th'))
          .map((c) => walkElement(c).trim());
        rows.push(cells);
      } else if (child.tag === 'thead' || child.tag === 'tbody') {
        collectRows(child.children);
      }
    }
  }

  collectRows(tableNode.children);

  if (rows.length === 0) return '';

  const colCount = Math.max(...rows.map((r) => r.length));
  const lines: string[] = [];

  lines.push('| ' + rows[0].join(' | ') + ' |');
  lines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |');

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    while (row.length < colCount) row.push('');
    lines.push('| ' + row.join(' | ') + ' |');
  }

  return lines.join('\n') + '\n\n';
}

/** Convert Confluence Storage Format XHTML to Markdown */
export function storageToMarkdown(storageXhtml: string): string {
  if (!storageXhtml || !storageXhtml.trim()) return '';

  try {
    const tree = parseHtml(storageXhtml);
    const result = tree.map(walkElement).join('');
    return result.replace(/\n{3,}/g, '\n\n').trim();
  } catch {
    // Fallback: strip tags manually
    return storageXhtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
