/**
 * @file claudemdRemove.ts
 * @description claudemd_remove 도구 핸들러 — CWD의 호스트 지침 문서에서 maencof 섹션 제거
 */
import { createProjectInstructionManager } from '../../../core/claudeMdMerger/operations/createProjectInstructionManager.js';
import type {
  ClaudeMdRemoveInput,
  ClaudeMdRemoveResult,
} from '../../../types/mcp.js';

/**
 * claudemd_remove 핸들러
 *
 * 대상 파일은 호스트가 정한다 (Claude=`CLAUDE.md` · Codex=`AGENTS.md`) — 병합한 쪽에서 지운다.
 *
 * @param cwd - CWD 절대 경로 (vault 경로)
 * @param input - 도구 입력
 */
export function handleClaudeMdRemove(
  cwd: string,
  input: ClaudeMdRemoveInput,
): ClaudeMdRemoveResult {
  const manager = createProjectInstructionManager(cwd);
  const plan = manager.plan({
    content: null,
    replaceDrift: false,
    backup: 'sibling',
  });
  const result = input.dry_run ? null : manager.apply(plan);
  const removed = (result ?? plan).outcomes[0]?.action === 'remove';
  const backupPath = result?.backupPaths[0];

  return {
    removed,
    ...(backupPath === undefined ? {} : { backup_path: backupPath }),
  };
}
