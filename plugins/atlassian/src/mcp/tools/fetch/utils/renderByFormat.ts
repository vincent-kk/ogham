import {
  markdownToAdf,
  markdownToStorage,
  markdownToWiki,
} from "../../../../converter/index.js";
import type { BodyFormat } from "./pickBodyFormat.js";

/** Render a markdown string into the body format selected by `pickBodyFormat`. */
export function renderByFormat(md: string, fmt: BodyFormat): unknown {
  if (fmt === "adf") return markdownToAdf(md);
  if (fmt === "storage-v1")
    return {
      storage: { value: markdownToStorage(md), representation: "storage" },
    };
  if (fmt === "storage-v2")
    return { representation: "storage", value: markdownToStorage(md) };
  return markdownToWiki(md);
}
