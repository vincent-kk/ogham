/**
 * @file claudemd-merge.ts
 * @description claudemd_merge 도구 핸들러 — CWD의 CLAUDE.md에 maencof 섹션 삽입/업데이트
 */
import { join } from 'node:path';

import { mergeMaencofSection } from '../../core/claude-md-merger.js';
import type { ClaudeMdMergeInput, ClaudeMdMergeResult } from '../../types/mcp.js';

/**
 * claudemd_merge 핸들러
 *
 * @param cwd - CWD 절대 경로 (vault 경로)
 * @param input - 도구 입력
 */
export function handleClaudeMdMerge(
  cwd: string,
  input: ClaudeMdMergeInput,
): ClaudeMdMergeResult {
  const claudeMdPath = join(cwd, 'CLAUDE.md');
  const result = mergeMaencofSection(claudeMdPath, input.content, {
    dryRun: input.dry_run ?? false,
    createIfMissing: true,
  });

  return {
    changed: result.changed,
    had_existing_section: result.hadExistingSection,
    backup_path: result.backupPath,
    section_content: input.content.trim(),
  };
}
