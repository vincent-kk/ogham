import { parseMarkdownBlocks } from "../markdown-parsing/parse-blocks.js";
import { renderBlocksToAdf } from "./render-blocks.js";
import type { AdfNode } from "../types/adf-node.js";

/** Convert Markdown text to an ADF document */
export function markdownToAdf(markdown: string): AdfNode {
  if (!markdown) {
    return {
      type: "doc",
      attrs: { version: 1 },
      content: [{ type: "paragraph", content: [] }],
    };
  }

  const content = renderBlocksToAdf(parseMarkdownBlocks(markdown));
  return {
    type: "doc",
    attrs: { version: 1 },
    content:
      content.length > 0 ? content : [{ type: "paragraph", content: [] }],
  };
}
