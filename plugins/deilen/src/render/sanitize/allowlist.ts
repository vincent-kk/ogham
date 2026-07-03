export type SanitizeProfile = "rendered" | "raw";

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
  // GitHub-parity raw HTML tags
  "details",
  "summary",
  "b",
  "i",
  "ins",
  "dl",
  "dt",
  "dd",
  "q",
  "cite",
  "abbr",
  "dfn",
  "samp",
  "var",
  "small",
  "time",
  "wbr",
  "figure",
  "figcaption",
  "caption",
  "tfoot",
  "ruby",
  "rt",
  "rp",
]);

// Internal deilen-generated attrs — "rendered" profile only. Raw-HTML-origin
// markup must never carry them (client renderer / line-anchor forgery).
export const INTERNAL_GLOBAL_ATTRS = new Set([
  "class",
  "data-source-line",
  "data-source-end",
]);

export const INTERNAL_TAG_ATTRS: Record<string, Set<string>> = {
  code: new Set(["data-lang"]),
  span: new Set(["data-display"]),
  div: new Set(["data-src"]),
};

// Content attrs — allowed for both profiles.
export const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  img: new Set(["src", "alt", "title"]),
  th: new Set(["style"]),
  td: new Set(["style"]),
  details: new Set(["open"]),
  time: new Set(["datetime"]),
  abbr: new Set(["title"]),
  ol: new Set(["start"]),
};

export const SAFE_STYLE_RE = /^text-align:\s*(?:left|right|center)$/;
