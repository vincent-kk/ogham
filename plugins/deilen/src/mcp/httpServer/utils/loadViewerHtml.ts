import { readFileSync } from "node:fs";
import { join } from "node:path";

import { bridgeRoot } from "./bridgeRoot.js";

let cached: string | null = null;

/** Read the built viewer template (`bridge/viewer.html`), cached. */
export function loadViewerHtml(): string {
  if (cached === null) {
    cached = readFileSync(join(bridgeRoot(), "viewer.html"), "utf-8");
  }
  return cached;
}
