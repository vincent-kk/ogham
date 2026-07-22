import { mkdirSync } from 'node:fs';

import { portableDirname } from '@ogham/cross-platform/compat';

import type { SeiriConfig } from '../../../../types/config.js';
import { writeAtomically } from '../../../utils/writeAtomically.js';
import { resolveConfigPath } from '../utils/resolveConfigPath.js';

/**
 * Persist the dial to `<repoRoot>/.seiri/config.json` and return the path
 * written. Called only from the settings-page save handler — nothing on a
 * session path writes config.
 */
export function writeConfig(projectRoot: string, config: SeiriConfig): string {
  const path = resolveConfigPath(projectRoot);
  mkdirSync(portableDirname(path), { recursive: true });
  writeAtomically(path, `${JSON.stringify(config, null, 2)}\n`);
  return path;
}
