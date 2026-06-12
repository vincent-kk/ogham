import { appendModeAudit } from '../../../core/infra/cacheManager/cacheManager.js';
import type { HookOutput, PreToolUseInput } from '../../../types/hooks.js';
import { isCriteriaMd, isDetailMd, isIntentMd } from '../../shared/shared.js';

/**
 * Record the mode-gate judgment for doc-contract targets (INTENT.md /
 * DETAIL.md / criteria.md) to `<cacheDir>/mode-audit.jsonl`. No-op for any
 * other path, so ordinary Write/Edit traffic stays unlogged.
 */
export function auditDocDecision(
  cwd: string,
  input: PreToolUseInput,
  filePath: string,
  merged: HookOutput,
  spikeMode: boolean,
): void {
  const rule = isIntentMd(filePath)
    ? 'intent-hygiene'
    : isDetailMd(filePath)
      ? 'detail-hygiene'
      : isCriteriaMd(filePath)
        ? 'criteria-ledger'
        : null;
  if (rule === null) return;

  const denied = merged.hookSpecificOutput?.permissionDecision === 'deny';
  const decision = denied
    ? 'deny'
    : spikeMode && rule !== 'criteria-ledger'
      ? 'exempt'
      : 'allow';
  appendModeAudit(cwd, {
    timestamp: new Date().toISOString(),
    sessionId: input.session_id,
    tool: input.tool_name,
    path: filePath,
    mode: spikeMode ? 'spike' : 'normal',
    decision,
    rule,
    ...(denied
      ? {
          reason:
            merged.hookSpecificOutput?.permissionDecisionReason?.split('\n')[0],
        }
      : {}),
  });
}
