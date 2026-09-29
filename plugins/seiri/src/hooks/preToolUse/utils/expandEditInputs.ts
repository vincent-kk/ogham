import { normalizeCodexToolUses } from '@ogham/cross-platform';

import { CODEX_PATCH_TOOL } from '../../../constants/editNotice.js';
import type { PreToolUseInput } from '../../../types/hooks.js';

/**
 * Expand a Codex `apply_patch` call into one logical edit payload per file
 * it writes. Every other tool passes through untouched, so Bash is never
 * rewritten into a Read here.
 * @param input Native PreToolUse payload.
 * @returns `[input]` for any tool other than `apply_patch` and for a patch
 *   that does not parse; otherwise the patch's `Write` (add, Move
 *   destination) and `Edit` (update) operations in patch order, each with
 *   the header's verbatim `tool_input.file_path`. Deletes and Move sources
 *   are dropped.
 */
export function expandEditInputs(input: PreToolUseInput): PreToolUseInput[] {
  if (input.tool_name !== CODEX_PATCH_TOOL) return [input];
  const normalized = normalizeCodexToolUses(input);
  if (!normalized.ok) return [input];
  return normalized.toolUses.flatMap((use) =>
    use.tool_name === 'Write' || use.tool_name === 'Edit'
      ? [{ ...input, tool_name: use.tool_name, tool_input: use.tool_input }]
      : [],
  );
}
