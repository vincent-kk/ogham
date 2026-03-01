/**
 * @file claudemd-remove.ts
 * @description claudemd_remove 도구 핸들러 — CWD의 CLAUDE.md에서 maencof 섹션 제거
 */
import { join } from 'node:path';

import { removeMaencofSection } from '../../core/claude-md-merger.js';
import type { ClaudeMdRemoveInput, ClaudeMdRemoveResult } from '../../types/mcp.js';

/**
 * claudemd_remove 핸들러
 *
 * @param cwd - CWD 절대 경로 (vault 경로)
 * @param input - 도구 입력
 */
export function handleClaudeMdRemove(
  cwd: string,
  input: ClaudeMdRemoveInput,
): ClaudeMdRemoveResult {
  const claudeMdPath = join(cwd, 'CLAUDE.md');
  const removed = removeMaencofSection(claudeMdPath, {
    dryRun: input.dry_run ?? false,
  });

  return {
    removed,
    backup_path: removed ? claudeMdPath + '.bak' : undefined,
  };
}
