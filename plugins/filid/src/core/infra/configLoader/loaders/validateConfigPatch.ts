import { sanitizeExemptPatterns } from '../utils/exemptSanitize.js';
import { formatIssuePath } from '../utils/formatIssuePath.js';
import { parseWithAllowlistWarn } from '../utils/parseWithAllowlistWarn.js';

import { FilidConfigSchema } from './configSchemas.js';
import type { ConfigPatchIssue, ConfigPatchValidation } from './configTypes.js';

/**
 * Validate a prospective `.filid/config.json` patch JSON string against the
 * shared `FilidConfigSchema`. No local schema is defined here — the schema is
 * the single source of truth.
 *
 * **No consumer today.** This backed the `config_patch_validate` MCP tool, which
 * 1.0 removed; `src/__tests__/integration/vnextToolSurface.test.ts` asserts that
 * name stays unregistered. Retained because it is the only schema-level patch
 * validator: the settings page writes through `writeConfig`, which validates a
 * whole config, not a partial patch. Delete it together with the next surface
 * review if no tool has claimed it by then.
 */
export function validateConfigPatch(patchJson: string): ConfigPatchValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(patchJson);
  } catch (err) {
    return {
      valid: false,
      errors: [
        {
          path: '<root>',
          message: `invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
    };
  }

  const strict = FilidConfigSchema.safeParse(parsed);
  if (strict.success) return { valid: true, errors: [] };

  const errors: ConfigPatchIssue[] = strict.error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
  }));

  // `validateConfigPatch` returns diagnostics via `errors[]`; the sanitize
  // callbacks' free-form warnings are redundant here, so swallow them.
  const noop = (): void => {};
  const { sanitized } = parseWithAllowlistWarn(parsed, strict.error, noop);
  const retry = FilidConfigSchema.safeParse(sanitized);
  if (retry.success) {
    const suggestionObject = sanitizeExemptPatterns(retry.data, noop);
    return {
      valid: false,
      errors,
      suggestion: JSON.stringify(suggestionObject, null, 2),
    };
  }

  return { valid: false, errors };
}
