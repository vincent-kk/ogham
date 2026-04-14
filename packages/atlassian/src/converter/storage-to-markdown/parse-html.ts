import type { HtmlElement, HtmlNode } from './html-node.js';

function parseAttributes(attrSource: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([\w:.-]+)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = attrRe.exec(attrSource)) !== null) {
    attrs[match[1]] = match[2];
  }

  return attrs;
}

function isVoidElement(tagName: string): boolean {
  return ['br', 'hr', 'img'].includes(tagName);
}

function isMatchingOpenTag(html: string, tagName: string, index: number): boolean {
  const nextChar = html[index + tagName.length + 1];
  return nextChar === '>' || nextChar === ' ' || nextChar === '/';
}

export function parseHtml(html: string): HtmlNode[] {
  const nodes: HtmlNode[] = [];
  let position = 0;

  while (position < html.length) {
    const tagStart = html.indexOf('<', position);

    if (tagStart === -1) {
      const text = html.slice(position);
      if (text) nodes.push(text);
      break;
    }

    if (tagStart > position) {
      const text = html.slice(position, tagStart);
      if (text) nodes.push(text);
    }

    if (html.startsWith('<!--', tagStart)) {
      const commentEnd = html.indexOf('-->', tagStart);
      position = commentEnd === -1 ? html.length : commentEnd + 3;
      continue;
    }

    if (html.startsWith('<![CDATA[', tagStart)) {
      const cdataEnd = html.indexOf(']]>', tagStart);
      if (cdataEnd !== -1) {
        nodes.push(html.slice(tagStart + 9, cdataEnd));
        position = cdataEnd + 3;
      } else {
        position = html.length;
      }
      continue;
    }

    if (html[tagStart + 1] === '/') break;

    const tagEnd = html.indexOf('>', tagStart);
    if (tagEnd === -1) break;

    const tagContent = html.slice(tagStart + 1, tagEnd);
    const selfClosing = tagContent.endsWith('/');
    const cleanContent = selfClosing ? tagContent.slice(0, -1).trim() : tagContent.trim();
    const spaceIndex = cleanContent.search(/\s/);
    const tagName = spaceIndex === -1 ? cleanContent : cleanContent.slice(0, spaceIndex);
    const attrSource = spaceIndex === -1 ? '' : cleanContent.slice(spaceIndex);

    const element: HtmlElement = {
      tag: tagName,
      attrs: parseAttributes(attrSource),
      children: [],
    };

    if (selfClosing || isVoidElement(tagName)) {
      position = tagEnd + 1;
      nodes.push(element);
      continue;
    }

    const closingTag = `</${tagName}>`;
    let depth = 1;
    let searchPosition = tagEnd + 1;

    while (depth > 0 && searchPosition < html.length) {
      const nextOpen = html.indexOf(`<${tagName}`, searchPosition);
      const nextClose = html.indexOf(closingTag, searchPosition);

      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        if (isMatchingOpenTag(html, tagName, nextOpen)) depth++;
        searchPosition = nextOpen + 1;
        continue;
      }

      depth--;
      if (depth === 0) {
        element.children = parseHtml(html.slice(tagEnd + 1, nextClose));
        position = nextClose + closingTag.length;
      } else {
        searchPosition = nextClose + 1;
      }
    }

    if (depth > 0) {
      element.children = parseHtml(html.slice(tagEnd + 1));
      position = html.length;
    }

    nodes.push(element);
  }

  return nodes;
}
