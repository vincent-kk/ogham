import { normalize } from "./operations/normalize.js";
import { resolveContainedPath } from "./operations/resolveContainedPath.js";
import { cacheDir } from "./state/cacheDir.js";
import { configDir } from "./state/configDir.js";
import { home } from "./state/home.js";
import { hostStateRoot } from "./state/hostStateRoot.js";
import { pluginCache } from "./state/pluginCache.js";
import { tmp } from "./state/tmp.js";

export {
  cacheDir,
  configDir,
  home,
  hostStateRoot,
  normalize,
  pluginCache,
  resolveContainedPath,
  tmp,
};

/** Object-form facade. Retained for ergonomic call sites; importing `paths`
 *  captures the env-paths dependency, so bundle-size sensitive callers (hooks)
 *  should prefer the named function exports above. */
export const paths = {
  home,
  tmp,
  configDir,
  cacheDir,
  pluginCache,
  normalize,
  hostStateRoot,
  resolveContainedPath,
};
