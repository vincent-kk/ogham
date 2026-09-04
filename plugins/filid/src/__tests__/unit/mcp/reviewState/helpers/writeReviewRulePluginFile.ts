import {
  ensureDirectorySync,
  portableDirname,
  resolveContainedPath,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

/**
 * Write one plugin-relative rule fixture atomically.
 *
 * @param pluginRoot - Temporary plugin root that contains the rule tree.
 * @param relativePath - Plugin-relative destination bounded by the fixture root.
 * @param content - Exact UTF-8 fixture bytes to persist.
 * @returns Nothing.
 */
export function writeReviewRulePluginFile(
  pluginRoot: string,
  relativePath: string,
  content: string,
): void {
  const path = resolveContainedPath(pluginRoot, relativePath);
  ensureDirectorySync(portableDirname(path));
  writeFileAtomicallySync(path, content);
}
