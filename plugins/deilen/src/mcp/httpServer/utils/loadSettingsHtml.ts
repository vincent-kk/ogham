import { readFileSync } from "node:fs";
import { join } from "node:path";

import { bridgeRoot } from "./bridgeRoot.js";

let cached: string | null = null;

/** Read the built settings template (`bridge/settings.html`), cached. */
export function loadSettingsHtml(): string {
  if (cached === null)
    cached = readFileSync(join(bridgeRoot(), "settings.html"), "utf-8");

  return cached;
}
