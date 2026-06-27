import { md } from "../markdownIt/markdownInstance.js";

import { isLocalImageSrc } from "./isLocalImageSrc.js";

/**
 * Visit every `file://` image src in document order — the SAME order
 * `imageRule` assigns indices during render, so the i-th visit corresponds to
 * `/api/image/<sid>/<i>`. This shared walk is the single source of truth that
 * keeps the rewrite and the serving route in lockstep.
 */
export function walkLocalImages(
  markdown: string,
  visit: (src: string, index: number) => void,
): void {
  const tokens = md.parse(markdown, {});
  let index = 0;
  for (const block of tokens) {
    if (block.type !== "inline" || !block.children) continue;
    for (const child of block.children) {
      if (child.type !== "image") continue;
      const src = child.attrGet("src");
      if (src !== null && isLocalImageSrc(src)) visit(src, index++);
    }
  }
}
