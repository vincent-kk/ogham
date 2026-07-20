import { readFileSync } from "node:fs";
import { join } from "node:path";

import { publicRoot } from "./publicRoot.js";

let cached: string | null = null;

/** Read the built viewer template (`public/viewer.html`), cached. */
export function loadViewerHtml(): string {
  if (cached === null)
    cached = readFileSync(join(publicRoot(), "viewer.html"), "utf-8");

  return cached;
}
