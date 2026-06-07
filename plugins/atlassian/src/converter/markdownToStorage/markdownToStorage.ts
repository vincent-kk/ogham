import { parseMarkdownBlocks } from "../markdownParsing/parseBlocks.js";
import { renderBlocksToStorage } from "./renderBlocks.js";

/** Convert Markdown to Confluence Storage Format XHTML */
export function markdownToStorage(markdown: string): string {
  if (!markdown || !markdown.trim()) return "";
  return renderBlocksToStorage(parseMarkdownBlocks(markdown));
}
