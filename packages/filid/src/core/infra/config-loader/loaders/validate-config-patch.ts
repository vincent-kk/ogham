import { sanitizeExemptPatterns } from '../utils/exempt-sanitize.js';
import { formatIssuePath } from '../utils/format-issue-path.js';
import { parseWithAllowlistWarn } from '../utils/parse-with-allowlist-warn.js';
import { FilidConfigSchema } from './config-schemas.js';
import type { ConfigPatchIssue, ConfigPatchValidation } from './config-types.js';

/**
 * Validate a prospective `.filid/config.json` patch JSON string against the
 * shared `FilidConfigSchema`. No local schema is defined — this is the
 * SSoT contract for the `mcp_t_config_patch_validate` MCP tool.
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
  if (strict.success) {
    return { valid: true, errors: [] };
  }

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
