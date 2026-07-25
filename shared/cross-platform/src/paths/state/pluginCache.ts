import { join } from "node:path";

import { stateRoot } from "./stateRoot.js";

export function pluginCache(pkg: string, version?: string): string {
  const base = join(stateRoot(), "plugins", pkg);
  return version ? join(base, version) : base;
}
