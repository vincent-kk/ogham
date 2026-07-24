import { portableJoin } from '@ogham/cross-platform/compat';

import {
  MANIFEST_FILE,
  RULES_DIR,
  TEMPLATES_DIR,
} from '../../../constants/files.js';

/** Absolute path of a rule template shipped inside the plugin. */
export function resolveTemplatePath(
  pluginRoot: string,
  filename: string,
): string {
  return portableJoin(pluginRoot, TEMPLATES_DIR, RULES_DIR, filename);
}

/** Absolute path of the plugin's rule manifest. */
export function resolveManifestPath(pluginRoot: string): string {
  return resolveTemplatePath(pluginRoot, MANIFEST_FILE);
}
