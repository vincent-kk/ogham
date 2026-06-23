import type MarkdownIt from "markdown-it";

/**
 * markdown-it core ruler: stamp every opening/self-closing block token that has
 * a source map with `data-source-line` (1-based start) and `data-source-end`
 * (markdown-it map end). These anchors back the viewer's line-level feedback.
 */
export function sourceLinePlugin(md: MarkdownIt): void {
  md.core.ruler.push("deilen_source_line", (state) => {
    for (const token of state.tokens) {
      if (token.nesting === -1) continue;
      const map = token.map;
      if (!map) continue;
      token.attrSet("data-source-line", String(map[0] + 1));
      token.attrSet("data-source-end", String(map[1]));
    }
    return true;
  });
}
