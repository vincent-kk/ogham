import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getDefaultAdapterIds } from '../../../../adapters/index.js';
import {
  CONFIG_DIR,
  CONFIG_FILE,
} from '../../../../constants/infraDefaults.js';
import { createLogger } from '../../../../lib/logger.js';
import { sanitizeExemptPatterns } from '../utils/exemptSanitize.js';
import { formatIssuePath } from '../utils/formatIssuePath.js';
import { parseWithAllowlistWarn } from '../utils/parseWithAllowlistWarn.js';
import { resolveGitRoot } from '../utils/resolveGitRoot.js';

import { FilidConfigSchema } from './configSchemas.js';
import type { ConfigDiagnostic, LoadConfigResult } from './configTypes.js';
import { migrateConfigV1 } from './migrateConfigV1.js';

const log = createLogger('config-loader');

export function loadConfig(projectRoot: string): LoadConfigResult {
  const resolvedRoot = resolveGitRoot(projectRoot);
  const configPath = join(resolvedRoot, CONFIG_DIR, CONFIG_FILE);
  const warnings: string[] = [];
  const diagnostics: ConfigDiagnostic[] = [];
  const addWarning = (message: string): void => {
    warnings.push(message);
    log.warn(message);
  };
  if (!existsSync(configPath)) return { config: null, warnings, diagnostics };

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (error) {
    addWarning(`failed to parse JSON at ${configPath}: ${String(error)}`);
    return { config: null, warnings, diagnostics };
  }

  let candidate = parsed;
  if (
    candidate &&
    typeof candidate === 'object' &&
    !Array.isArray(candidate) &&
    (candidate as Record<string, unknown>).version === '1.0'
  ) {
    const [legacyAdapterId] = getDefaultAdapterIds();
    const migrated = migrateConfigV1(candidate, legacyAdapterId);
    candidate = migrated.config;
    diagnostics.push(...migrated.diagnostics);
  }

  const strict = FilidConfigSchema.safeParse(candidate);
  if (strict.success)
    return {
      config: sanitizeExemptPatterns(strict.data, addWarning),
      warnings,
      diagnostics,
    };

  const { sanitized } = parseWithAllowlistWarn(
    candidate,
    strict.error,
    addWarning,
  );
  const retry = FilidConfigSchema.safeParse(sanitized);
  if (retry.success)
    return {
      config: sanitizeExemptPatterns(retry.data, addWarning),
      warnings,
      diagnostics,
    };

  for (const issue of retry.error.issues)
    addWarning(
      `config validation failed at ${formatIssuePath(issue.path)}: ${issue.message}`,
    );
  return { config: null, warnings, diagnostics };
}
