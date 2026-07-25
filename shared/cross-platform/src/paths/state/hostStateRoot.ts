import { homedir } from "node:os";
import { join } from "node:path";

import type { KnownHost } from "../../hostRegistry/index.js";
import { HOSTS } from "../../hostRegistry/registry.js";

export function hostStateRoot(
  host: KnownHost,
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const descriptor = HOSTS[host];
  return (
    env[descriptor.stateRootEnv] ?? join(homedir(), descriptor.stateRootDir)
  );
}
