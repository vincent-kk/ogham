import { readFileSync } from 'node:fs';

import type { LoadConfigResult } from '../../../../types/config.js';
import { isInterventionLevel } from '../utils/isInterventionLevel.js';
import { resolveConfigPath } from '../utils/resolveConfigPath.js';

/**
 * Read `<repoRoot>/.seiri/config.json`.
 *
 * Never throws. A missing file is the normal state for a project that has
 * not run setup, and a damaged one must not take the session down with it
 * — both yield `config: null` and the caller falls back to defaults. The
 * two cases are still distinguishable: only the damaged one sets
 * `warning`, so the SessionStart render can say the dial was ignored
 * rather than silently showing `advisory`.
 */
export function loadConfig(projectRoot: string): LoadConfigResult {
  const path = resolveConfigPath(projectRoot);

  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return { config: null, path };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { config: null, path, warning: 'config.json is not valid JSON' };
  }

  if (typeof parsed !== 'object' || parsed === null)
    return { config: null, path, warning: 'config.json is not an object' };

  const { intervention } = parsed as { intervention?: unknown };
  if (!isInterventionLevel(intervention))
    return {
      config: null,
      path,
      warning: `unknown intervention level: ${JSON.stringify(intervention)}`,
    };

  return { config: { intervention }, path };
}
