import { portableJoin } from '@ogham/cross-platform/compat';

import { RULES_DIR, TEMPLATES_DIR } from '../../../constants/files.js';

/** Absolute path of a rule template shipped inside the plugin. */
export function resolveTemplatePath(
  pluginRoot: string,
  filename: string,
): string {
  return portableJoin(pluginRoot, TEMPLATES_DIR, RULES_DIR, filename);
}
