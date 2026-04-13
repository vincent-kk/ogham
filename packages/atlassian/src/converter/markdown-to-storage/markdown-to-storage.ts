import { parseMarkdownBlocks } from "../markdown-parsing/parse-blocks.js";
import { renderBlocksToStorage } from "./render-blocks.js";

/** Convert Markdown to Confluence Storage Format XHTML */
export function markdownToStorage(markdown: string): string {
  if (!markdown || !markdown.trim()) return "";
  return renderBlocksToStorage(parseMarkdownBlocks(markdown));
}
