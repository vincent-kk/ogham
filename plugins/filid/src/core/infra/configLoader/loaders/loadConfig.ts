import {
  mergeConfigLayers,
  readConfigLayers,
} from '@ogham/cross-platform/config-scope';
import type { ConfigLayerPaths } from '@ogham/cross-platform/config-scope';

import { getDefaultAdapterIds } from '../../../../adapters/index.js';
import { createLogger } from '../../../../lib/logger.js';
import { configLayers } from '../utils/configLayers.js';
import { sanitizeExemptPatterns } from '../utils/exemptSanitize.js';
import { formatIssuePath } from '../utils/formatIssuePath.js';
import { parseWithAllowlistWarn } from '../utils/parseWithAllowlistWarn.js';

import { FilidConfigSchema } from './configSchemas.js';
import type { ConfigDiagnostic, LoadConfigResult } from './configTypes.js';
import { migrateConfigV1 } from './migrateConfigV1.js';

const log = createLogger('config-loader');

/**
 * Read the config in effect: the user layer with the project layer laid
 * over it.
 *
 * v1 migration runs per layer, before the merge, because v1→v2 is a shape
 * change — merging the two shapes first would produce a document neither
 * schema describes.
 *
 * Only the merged result is validated. A project layer holds just the keys
 * it overrides and cannot satisfy the strict schema on its own, which is
 * also why `rules[*].exempt` and every other array is replaced wholesale
 * rather than merged element by element.
 *
 * @param projectRoot Anchor for the project layer and for v1 migration.
 * @param layers Layer coordinates to read. Defaults to this project's two;
 *   pass `project: null` to ask what the user layer decides alone.
 * @returns The config, plus warnings and migration diagnostics. `config` is
 *   `null` when no layer supplied one or the merge failed validation.
 */
export function loadConfig(
  projectRoot: string,
  layers: ConfigLayerPaths = configLayers(projectRoot),
): LoadConfigResult {
  const warnings: string[] = [];
  const diagnostics: ConfigDiagnostic[] = [];
  const addWarning = (message: string): void => {
    warnings.push(message);
    log.warn(message);
  };

  const documents = readConfigLayers(layers);
  for (const warning of documents.warnings) addWarning(warning);

  const user = migrateIfV1(documents.user, diagnostics);
  const project = migrateIfV1(documents.project, diagnostics);
  if (user === null && project === null)
    return { config: null, warnings, diagnostics };

  const candidate = mergeConfigLayers(user, project);
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

/** Lift one layer from v1 to v2 shape; anything else passes through. */
function migrateIfV1(
  document: Record<string, unknown> | null,
  diagnostics: ConfigDiagnostic[],
): Record<string, unknown> | null {
  if (document === null || document.version !== '1.0') return document;
  const [legacyAdapterId] = getDefaultAdapterIds();
  const migrated = migrateConfigV1(document, legacyAdapterId);
  diagnostics.push(...migrated.diagnostics);
  return migrated.config as Record<string, unknown>;
}
