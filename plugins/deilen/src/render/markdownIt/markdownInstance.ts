import MarkdownIt from "markdown-it";

import { sanitizeHtml } from "../sanitize/sanitizeHtml.js";
import { lineAttrs } from "../utils/lineAttrs.js";

import { imageRule } from "./imageRule.js";
import { mathBlock } from "./mathBlockRule.js";
import { mathInline } from "./mathInlineRule.js";
import { sourceLinePlugin } from "./sourceLinePlugin.js";
import { taskList } from "./taskListRule.js";

const LEADING_OPEN_TAG_PATTERN = /^\s*<[a-zA-Z][a-zA-Z0-9]*/;
const FILE_SCHEME_PATTERN = /^file:\/\//i;
const WHITESPACE_PATTERN = /\s+/;

function createMarkdownIt(): MarkdownIt {
  const instance = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  });
  const escapeHtml = instance.utils.escapeHtml;

  // Allow file:// so local-image tokens are produced; imageRule rewrites their
  // src to /api/image and sanitize still strips any file:// link href.
  const defaultValidateLink = instance.validateLink.bind(instance);
  instance.validateLink = (url) =>
    FILE_SCHEME_PATTERN.test(url.trim()) || defaultValidateLink(url);

  sourceLinePlugin(instance);
  instance.inline.ruler.after("escape", "math_inline", mathInline);
  instance.block.ruler.after("blockquote", "math_block", mathBlock, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
  taskList(instance);
  imageRule(instance);

  instance.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const language = token.info.trim().split(WHITESPACE_PATTERN, 1)[0] ?? "";
    const attributes = lineAttrs(token);
    const escaped = escapeHtml(token.content);
    if (language === "mermaid")
      return `<div class="deilen-mermaid"${attributes}><pre class="deilen-mermaid-src">${escaped}</pre></div>\n`;

    const languageClass = language
      ? ` class="language-${escapeHtml(language)}"`
      : "";
    const languageAttribute = language
      ? ` data-lang="${escapeHtml(language)}"`
      : "";
    return `<pre${attributes}><code${languageClass}${languageAttribute}>${escaped}</code></pre>\n`;
  };

  // Raw HTML is sanitized per-token with the "raw" profile (author markup must
  // not carry deilen-internal class/data-* attrs). Blocks get the line anchor
  // injected into their first opening tag — a wrapper div would break the
  // GitHub pattern of markdown between <details> and </details> blocks.
  instance.renderer.rules.html_block = (tokens, index) => {
    const token = tokens[index];
    const sanitized = sanitizeHtml(token.content, "raw");
    const attributes = lineAttrs(token);
    if (!attributes) return sanitized;
    return sanitized.replace(
      LEADING_OPEN_TAG_PATTERN,
      (match) => match + attributes,
    );
  };

  instance.renderer.rules.html_inline = (tokens, index) =>
    sanitizeHtml(tokens[index].content, "raw");

  instance.renderer.rules.math_inline = (tokens, index) =>
    `<span class="deilen-math" data-display="0">${escapeHtml(tokens[index].content)}</span>`;

  instance.renderer.rules.math_block = (tokens, index) => {
    const token = tokens[index];
    return `<p class="deilen-math-block"${lineAttrs(token)}><span class="deilen-math" data-display="1">${escapeHtml(token.content)}</span></p>\n`;
  };

  return instance;
}

/** Shared, stateless markdown-it instance configured for deilen base rendering. */
export const markdownIt = createMarkdownIt();
