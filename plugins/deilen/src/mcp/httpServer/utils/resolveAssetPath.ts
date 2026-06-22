import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";

import { bridgeRoot } from "./bridgeRoot.js";

const ALLOWED_EXT = new Set([".js", ".map"]);
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

/**
 * Map a `/assets/<name>` request to a real file under `bridge/assets/`. Only a
 * single safe path segment with an allowed extension that actually exists is
 * accepted; everything else (slashes, `..`, unknown ext, missing) returns null.
 */
export function resolveAssetPath(name: string): string | null {
  if (!SAFE_NAME.test(name)) return null;
  if (!ALLOWED_EXT.has(extname(name).toLowerCase())) return null;
  const assetsDir = join(bridgeRoot(), "assets");
  const full = normalize(join(assetsDir, name));
  if (full !== join(assetsDir, name)) return null;
  if (!existsSync(full)) return null;
  return full;
}
