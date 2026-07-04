import { markdownIt } from "../markdownIt/markdownInstance.js";

import { isLocalImageSrc } from "./isLocalImageSrc.js";

/**
 * Visit every `file://` image src in document order — the SAME order
 * `imageRule` assigns indices during render, so the i-th visit corresponds to
 * `/api/image/<sid>/<i>`. This shared walk is the single source of truth that
 * keeps the rewrite and the serving route in lockstep.
 */
export function walkLocalImages(
  markdown: string,
  visit: (source: string, index: number) => void,
): void {
  const tokens = markdownIt.parse(markdown, {});
  let index = 0;
  for (const block of tokens) {
    if (block.type !== "inline" || !block.children) continue;
    for (const child of block.children) {
      if (child.type !== "image") continue;
      const source = child.attrGet("src");
      if (source !== null && isLocalImageSrc(source)) visit(source, index++);
    }
  }
}
