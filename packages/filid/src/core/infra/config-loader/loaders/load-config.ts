import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import { CONFIG_DIR, CONFIG_FILE } from '../../../../constants/infra-defaults.js';
import { sanitizeExemptPatterns } from '../utils/exempt-sanitize.js';
import { resolveGitRoot } from '../utils/resolve-git-root.js';
import { formatIssuePath } from '../utils/format-issue-path.js';
import { parseWithAllowlistWarn } from '../utils/parse-with-allowlist-warn.js';
import { FilidConfigSchema } from './config-schemas.js';
import type { LoadConfigResult } from './config-types.js';

const log = createLogger('config-loader');

/**
 * Read `.filid/config.json` from the given project root (resolves git root).
 *
 * Returns `{ config, warnings }`. Zod-based strict validation is applied;
 * unknown top-level or rule-override keys are warn+dropped (never
 * pass-through), and invalid `rules[*].exempt` globs (including the bare
 * `**` wildcard) are rejected at load time. Consumers that do not need
 * warnings may destructure only `{ config }`.
 */
export function loadConfig(projectRoot: string): LoadConfigResult {
  const resolvedRoot = resolveGitRoot(projectRoot);
  const configPath = join(resolvedRoot, CONFIG_DIR, CONFIG_FILE);
  const warnings: string[] = [];
  const addWarning = (msg: string): void => {
    warnings.push(msg);
    log.warn(msg);
  };
  if (!existsSync(configPath)) {
    log.debug('config not found', configPath);
    return { config: null, warnings };
  }

  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch (err) {
    log.error('failed to read config', err);
    addWarning(`failed to read ${configPath}: ${String(err)}`);
    return { config: null, warnings };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    log.error('failed to parse config JSON', err);
    addWarning(`failed to parse JSON at ${configPath}: ${String(err)}`);
    return { config: null, warnings };
  }

  const strict = FilidConfigSchema.safeParse(parsed);
  if (strict.success) {
    log.debug('config loaded (strict)', configPath);
    return { config: sanitizeExemptPatterns(strict.data, addWarning), warnings };
  }

  const { sanitized } = parseWithAllowlistWarn(
    parsed,
    strict.error,
    addWarning,
  );

  const retry = FilidConfigSchema.safeParse(sanitized);
  if (retry.success) {
    log.debug('config loaded (sanitized)', configPath);
    return { config: sanitizeExemptPatterns(retry.data, addWarning), warnings };
  }

  for (const issue of retry.error.issues) {
    addWarning(
      `config validation failed at ${formatIssuePath(issue.path)}: ${issue.message}`,
    );
  }
  return { config: null, warnings };
}
