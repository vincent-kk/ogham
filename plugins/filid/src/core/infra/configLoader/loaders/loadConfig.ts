import {
  type ConfigLayerPaths,
  mergeConfigLayers,
  readConfigLayers,
} from '@ogham/cross-platform';

import { createLogger } from '../../../../lib/logger.js';
import { configLayers } from '../utils/configLayers.js';
import { sanitizeExemptPatterns } from '../utils/exemptSanitize.js';
import { formatIssuePath } from '../utils/formatIssuePath.js';
import { parseWithAllowlistWarn } from '../utils/parseWithAllowlistWarn.js';
import { sanitizePathPatterns } from '../utils/pathPatternSanitize.js';

import { FilidConfigSchema } from './configSchemas.js';
import type {
  ConfigDiagnostic,
  ConfigWarning,
  LoadConfigResult,
} from './configTypes.js';
import { normalizeConfigLayer } from './normalizeConfigLayer.js';

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
 * @returns The config, plus warnings (each with the config path it dropped)
 *   and migration diagnostics. `config` is `null` when no layer supplied one
 *   or the merge failed validation; that failure's warnings carry a `null` path.
 */
export function loadConfig(
  projectRoot: string,
  layers: ConfigLayerPaths = configLayers(projectRoot),
): LoadConfigResult {
  const warnings: ConfigWarning[] = [];
  const diagnostics: ConfigDiagnostic[] = [];
  const addWarning = (message: string, key: ConfigWarning['key']): void => {
    warnings.push({ message, key });
    log.warn(message);
  };

  const documents = readConfigLayers(layers);
  for (const warning of documents.warnings) addWarning(warning, null);

  const user = normalizeConfigLayer(documents.user, diagnostics);
  const project = normalizeConfigLayer(documents.project, diagnostics);
  if (user === null && project === null)
    return { config: null, warnings, diagnostics };

  const candidate = mergeConfigLayers(user, project);
  const strict = FilidConfigSchema.safeParse(candidate);
  if (strict.success)
    return {
      config: sanitizePathPatterns(sanitizeExemptPatterns(strict.data, addWarning), addWarning),
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
      config: sanitizePathPatterns(sanitizeExemptPatterns(retry.data, addWarning), addWarning),
      warnings,
      diagnostics,
    };

  for (const issue of retry.error.issues)
    addWarning(
      `config validation failed at ${formatIssuePath(issue.path)}: ${issue.message}`,
      null,
    );
  return { config: null, warnings, diagnostics };
}
