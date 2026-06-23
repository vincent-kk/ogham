import MarkdownIt from "markdown-it";

import { lineAttrs } from "../utils/lineAttrs.js";

import { mathBlock } from "./mathBlockRule.js";
import { mathInline } from "./mathInlineRule.js";
import { sourceLinePlugin } from "./sourceLinePlugin.js";
import { taskList } from "./taskListRule.js";

function createMarkdownIt(): MarkdownIt {
  const markdown = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
  });
  const escapeHtml = markdown.utils.escapeHtml;

  sourceLinePlugin(markdown);
  markdown.inline.ruler.after("escape", "math_inline", mathInline);
  markdown.block.ruler.after("blockquote", "math_block", mathBlock, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
  taskList(markdown);

  markdown.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const lang = token.info.trim().split(/\s+/, 1)[0] ?? "";
    const attrs = lineAttrs(token);
    const escaped = escapeHtml(token.content);
    if (lang === "mermaid") {
      return `<div class="deilen-mermaid"${attrs}><pre class="deilen-mermaid-src">${escaped}</pre></div>\n`;
    }
    const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : "";
    const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : "";
    return `<pre${attrs}><code${langClass}${langAttr}>${escaped}</code></pre>\n`;
  };

  markdown.renderer.rules.math_inline = (tokens, idx) =>
    `<span class="deilen-math" data-display="0">${escapeHtml(tokens[idx].content)}</span>`;

  markdown.renderer.rules.math_block = (tokens, idx) => {
    const token = tokens[idx];
    return `<p class="deilen-math-block"${lineAttrs(token)}><span class="deilen-math" data-display="1">${escapeHtml(token.content)}</span></p>\n`;
  };

  return markdown;
}

/** Shared, stateless markdown-it instance configured for deilen base rendering. */
export const md = createMarkdownIt();
