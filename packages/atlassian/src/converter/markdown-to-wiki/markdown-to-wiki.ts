import { parseMarkdownBlocks } from "../markdown-parsing/parse-blocks.js";
import { renderBlocksToWiki } from "./render-blocks.js";

export function markdownToWiki(markdown: string): string {
  if (!markdown) return "";
  return renderBlocksToWiki(parseMarkdownBlocks(markdown)).join("\n\n");
}
