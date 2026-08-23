/**
 * @file layerGuard.ts
 * @description PreToolUse Hook — Guard Layer 1 (01_Core/) file mutations
 * Guides modification through the identity-guardian agent
 */
import { canonicalizeTargetPathSync } from '@ogham/cross-platform';

import { isLayer1Path } from '../../../../types/layer.js';
import { isInsideMaencofVault } from '../../../shared/isMaencofVault.js';

export interface PreToolUseInput {
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    path?: string;
    [key: string]: unknown;
  };
  cwd?: string;
}

export interface PreToolUseResult {
  continue: boolean;
  /** Message to display when the action is blocked */
  reason?: string;
}

/**
 * Layer Guard Hook handler.
 * Blocks Write/Edit/Delete attempts that mutate Layer 1 (01_Core/) files.
 * Always passes through if not in a maencof vault.
 */
export function runLayerGuard(input: PreToolUseInput): PreToolUseResult {
  const cwd = input.cwd ?? process.cwd();

  // Always pass through if not in a maencof vault. Walk up from cwd — on agy the
  // hook receives only the edited file's own folder (a vault subdirectory like
  // 01_Core/), not the vault root, so an exact-match check would miss it.
  if (!isInsideMaencofVault(cwd)) return { continue: true };

  const filePath = input.tool_input?.file_path ?? input.tool_input?.path ?? '';
  if (!filePath) return { continue: true };

  const canonicalPath = canonicalizeTargetPathSync(cwd, filePath, {
    preserveTerminalEntry: input.tool_name === 'Delete',
  });
  if (isLayer1Path(canonicalPath))
    return {
      continue: false,
      reason: [
        `[maencof] Direct modification of Layer 1 (01_Core/) files is restricted.`,
        `File: ${filePath}`,
        ``,
        `Layer 1 requires structured verification. To modify:`,
        `  1. Invoke identity-guardian agent for impact analysis + approval recommendation`,
        `  2. Or use update with change_reason + justification (min 20 chars) + confirm_l1: true`,
        `  Valid change_reason: identity_evolution, error_correction, info_update, consolidation, reinterpretation`,
      ].join('\n'),
    };

  return { continue: true };
}
