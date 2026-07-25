import { MANIFEST_FILE } from '../../../constants/files.js';

import { resolveTemplatePath } from './resolveTemplatePath.js';

/** Absolute path of the plugin's rule manifest. */
export function resolveManifestPath(pluginRoot: string): string {
  return resolveTemplatePath(pluginRoot, MANIFEST_FILE);
}
