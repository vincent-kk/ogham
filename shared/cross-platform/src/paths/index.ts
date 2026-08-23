export { normalize } from "./operations/normalize.js";
export { resolveContainedPath } from "./operations/resolveContainedPath.js";
export { paths } from "./paths.js";
export { cacheDir } from "./state/cacheDir.js";
export { configDir } from "./state/configDir.js";
export { home } from "./state/home.js";
export { hostStateRoot } from "./state/hostStateRoot.js";
export { pluginCache } from "./state/pluginCache.js";
export { tmp } from "./state/tmp.js";
export {
  isPosixLikePath,
  isWindowsLikePath,
  pathForCompare,
  portableBasename,
  portableDirname,
  portableIsAbsolute,
  portableJoin,
  portableRelative,
  portableResolve,
  samePath,
} from "./compat/index.js";
