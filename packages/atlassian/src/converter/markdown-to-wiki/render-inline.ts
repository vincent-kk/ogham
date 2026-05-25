import {
  tokenizeInlineMarkdown,
  type InlineToken,
} from "../markdown-parsing/tokenize-inline.js";

function renderToken(token: InlineToken): string {
  switch (token.type) {
    case "text":
      return token.text;
    case "code":
      return `{{${token.text}}}`;
    case "strong":
      return `*${token.text}*`;
    case "em":
      return `_${token.text}_`;
    case "strike":
      return `-${token.text}-`;
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
