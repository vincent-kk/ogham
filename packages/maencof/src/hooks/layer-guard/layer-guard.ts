/**
 * @file layer-guard.ts
 * @description PreToolUse Hook — Warn when modifying Layer 1 (01_Core/) files
 * Guides modification through the identity-guardian agent
 */
import { isLayer1Path, isMaencofVault } from '../shared/index.js';

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
 * Warns when Write/Edit tools attempt to modify Layer 1 (01_Core/) files.
 * Always passes through if not in a maencof vault.
 */
export function runLayerGuard(input: PreToolUseInput): PreToolUseResult {
  const cwd = input.cwd ?? process.cwd();

  // Always pass through if not in a maencof vault
  if (!isMaencofVault(cwd)) {
    return { continue: true };
  }

  const filePath = input.tool_input?.file_path ?? input.tool_input?.path ?? '';
  if (!filePath) {
    return { continue: true };
  }

  if (isLayer1Path(filePath)) {
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
  }

  return { continue: true };
}
