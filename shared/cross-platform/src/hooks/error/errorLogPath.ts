import { join } from "node:path";

import { pluginCache } from "../../paths/state/pluginCache.js";

/** The host-aware error log path used by hook diagnostics. */
export function errorLogPath(pkg: string): string {
  return join(pluginCache(pkg), "error-log.json");
}
