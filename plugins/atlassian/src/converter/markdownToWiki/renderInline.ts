import {
  tokenizeInlineMarkdown,
  type InlineToken,
} from "../markdownParsing/tokenizeInline.js";

const WIKI_SPECIAL_RE = /\\?[[\]{}|*_^~!+-]/g;

function escapeWikiText(text: string): string {
  return text.replace(WIKI_SPECIAL_RE, (match) =>
    match.length === 2 ? match : `\\${match}`,
  );
}

// link/image bodies stay raw: backslash escapes break [alias|href] parsing
// and leak verbatim into !url|alt=...! attributes.
function renderToken(token: InlineToken): string {
  switch (token.type) {
    case "text":
      return escapeWikiText(token.text);
    case "code":
      return `{{${escapeWikiText(token.text)}}}`;
    case "strong":
      return `*${escapeWikiText(token.text)}*`;
    case "em":
      return `_${escapeWikiText(token.text)}_`;
    case "strike":
      return `-${escapeWikiText(token.text)}-`;
    case "link":
      return `[${token.text}|${token.href}]`;
    case "image":
      return `!${token.url}|alt=${token.alt}!`;
  }
}

export function renderInlineToWiki(text: string): string {
  if (!text) return "";
  return tokenizeInlineMarkdown(text).map(renderToken).join("");
}
