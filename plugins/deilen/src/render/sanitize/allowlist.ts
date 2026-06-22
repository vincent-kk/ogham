export const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "em",
  "strong",
  "del",
  "s",
  "sup",
  "sub",
  "mark",
  "kbd",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "div",
  "span",
]);

export const GLOBAL_ATTRS = new Set([
  "class",
  "data-source-line",
  "data-source-end",
]);

export const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  img: new Set(["src", "alt", "title"]),
  code: new Set(["data-lang"]),
  span: new Set(["data-display"]),
  div: new Set(["data-src"]),
  th: new Set(["style"]),
  td: new Set(["style"]),
};

export const SAFE_STYLE_RE = /^text-align:\s*(?:left|right|center)$/;
