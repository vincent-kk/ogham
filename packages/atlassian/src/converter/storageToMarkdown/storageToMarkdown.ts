import { parseHtml } from "./parseHtml.js";
import { renderStorageNode } from "./renderStorageNode.js";
import { stripTagsFallback } from "./stripTagsFallback.js";

/** Convert Confluence Storage Format XHTML to Markdown */
export function storageToMarkdown(storageXhtml: string): string {
  if (!storageXhtml || !storageXhtml.trim()) return "";

  try {
    const tree = parseHtml(storageXhtml);
    const result = tree.map(renderStorageNode).join("");
    return result.replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return stripTagsFallback(storageXhtml);
  }
}
