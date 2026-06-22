import MarkdownIt from "markdown-it";

import { lineAttrs } from "../utils/lineAttrs.js";

import { mathBlock } from "./mathBlockRule.js";
import { mathInline } from "./mathInlineRule.js";
import { sourceLinePlugin } from "./sourceLinePlugin.js";

function createMarkdownIt(): MarkdownIt {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
  const escapeHtml = md.utils.escapeHtml;

  sourceLinePlugin(md);
  md.inline.ruler.after("escape", "math_inline", mathInline);
  md.block.ruler.after("blockquote", "math_block", mathBlock, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });

  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const lang = token.info.trim().split(/\s+/, 1)[0] ?? "";
    const attrs = lineAttrs(token);
    const escaped = escapeHtml(token.content);
    if (lang === "mermaid") {
      return `<div class="dalen-mermaid"${attrs}><pre class="dalen-mermaid-src">${escaped}</pre></div>\n`;
    }
    const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : "";
    const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : "";
    return `<pre${attrs}><code${langClass}${langAttr}>${escaped}</code></pre>\n`;
  };

  md.renderer.rules.math_inline = (tokens, idx) =>
    `<span class="dalen-math" data-display="0">${escapeHtml(tokens[idx].content)}</span>`;

  md.renderer.rules.math_block = (tokens, idx) => {
    const token = tokens[idx];
    return `<p class="dalen-math-block"${lineAttrs(token)}><span class="dalen-math" data-display="1">${escapeHtml(token.content)}</span></p>\n`;
  };

  return md;
}

/** Shared, stateless markdown-it instance configured for dalen base rendering. */
export const md = createMarkdownIt();
