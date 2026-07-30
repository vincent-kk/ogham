import { homedir } from "node:os";
import { join } from "node:path";

import { resolveHostDescriptor } from "../../hostRegistry/index.js";

export function stateRoot(): string {
  const host = resolveHostDescriptor(process.env);
  return process.env[host.stateRootEnv] ?? join(homedir(), host.stateRootDir);
}
