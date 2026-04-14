import { convertBlock } from "./convert-block.js";
import type { AdfNode } from "../types/adf-node.js";

/** Convert an ADF document or node to Markdown */
export function adfToMarkdown(adf: unknown): string | null {
  if (adf === null || adf === undefined) return null;
  if (typeof adf === "string") return adf;

  if (Array.isArray(adf)) {
    const texts = (adf as AdfNode[])
      .map((item) => convertBlock(item))
      .filter(Boolean);
    return texts.length > 0 ? texts.join("\n\n") : null;
  }

  const node = adf as AdfNode;
  if (node.type === "doc" && node.content) {
    const blocks = node.content
      .map((child) => convertBlock(child))
      .filter(Boolean);
    return blocks.length > 0 ? blocks.join("\n\n") : null;
  }

  const result = convertBlock(node);
  return result || null;
}
