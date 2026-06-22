import { readFileSync } from "node:fs";
import { join } from "node:path";

import { bridgeRoot } from "./bridgeRoot.js";

let cached: string | null = null;

/** Read the built report viewer template (`bridge/report.html`), cached. */
export function loadReportHtml(): string {
  if (cached === null) {
    cached = readFileSync(join(bridgeRoot(), "report.html"), "utf-8");
  }
  return cached;
}
