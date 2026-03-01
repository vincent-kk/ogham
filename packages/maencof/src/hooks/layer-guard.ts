/**
 * @file layer-guard.ts
 * @description PreToolUse Hook — Warn when modifying Layer 1 (01_Core/) files
 * Guides modification through the identity-guardian agent
 */
import { isLayer1Path, isMaencofVault } from './shared.js';

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
        `Layer 1 documents contain core identity (Hub nodes). To modify:`,
        `  1. Request changes through the identity-guardian agent (auto-delegated)`,
        `  2. Or retry with a sufficient justification`,
      ].join('\n'),
    };
  }

  return { continue: true };
}
