import { parseMarkdownBlocks } from "../markdownParsing/parseBlocks.js";
import { renderBlocksToWiki } from "./operations/renderBlocks.js";

export function markdownToWiki(markdown: string): string {
  if (!markdown) return "";
  return renderBlocksToWiki(parseMarkdownBlocks(markdown)).join("\n\n");
}
