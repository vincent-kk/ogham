/**
 * @file config-patch-validate.ts
 * @description MCP tool handler — validates a `.filid/config.json` patch
 * candidate against the shared `FilidConfigSchema` (SSoT: re-exported from
 * `core/infra/config-loader`). Used by Phase D chairperson to block
 * hallucinated config keys before they enter `fix-requests.md`.
 *
 * AC12 invariant: this module MUST NOT declare any local zod schema — the
 * schema lives exactly once in the config-loader module and is re-exported.
 */
import {
  validateConfigPatch,
  type ConfigPatchValidation,
} from '../../../core/infra/config-loader/config-loader.js';

export interface ConfigPatchValidateInput {
  patch_json: string;
  source_context?: string;
}

export type ConfigPatchValidateResult = ConfigPatchValidation;

/**
 * Handle `mcp_t_config_patch_validate` MCP calls.
 *
 * Parses `patch_json` and validates it strictly; returns `{ valid, errors[],
 * suggestion? }`. `suggestion` is a sanitised JSON string that would pass
 * strict validation — present only when the sanitize pipeline recovered a
 * valid config from the caller's patch. The `source_context` field is
 * accepted for traceability but unused in the current handler.
 */
export async function handleConfigPatchValidate(
  args: unknown,
): Promise<ConfigPatchValidateResult> {
  const input = args as ConfigPatchValidateInput;
  if (typeof input?.patch_json !== 'string') {
    throw new Error('patch_json is required and must be a string');
  }
  return validateConfigPatch(input.patch_json);
}
