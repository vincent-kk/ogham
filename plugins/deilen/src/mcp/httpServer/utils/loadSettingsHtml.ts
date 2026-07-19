import { readFileSync } from "node:fs";
import { join } from "node:path";

import { publicRoot } from "./publicRoot.js";

let cached: string | null = null;

/** Read the built settings template (`public/settings.html`), cached. */
export function loadSettingsHtml(): string {
  if (cached === null)
    cached = readFileSync(join(publicRoot(), "settings.html"), "utf-8");

  return cached;
}
