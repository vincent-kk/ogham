import { parseHtml } from "./parse-html.js";
import { renderStorageNode } from "./render-storage-node.js";
import { stripTagsFallback } from "./strip-tags-fallback.js";

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
