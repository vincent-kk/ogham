/**
 * @file claudemdMerge.ts
 * @description claudemd_merge 도구 핸들러 — CWD의 호스트 지침 문서에 maencof 섹션 삽입/업데이트
 */
import { createProjectInstructionManager } from '../../../core/claudeMdMerger/index.js';
import type {
  ClaudeMdMergeInput,
  ClaudeMdMergeResult,
} from '../../../types/mcp.js';

/**
 * claudemd_merge 핸들러
 *
 * 대상 파일은 호스트가 정한다 — Claude 는 `CLAUDE.md`, Codex 는 `AGENTS.md` 를 읽는다.
 * 안 읽는 쪽에 쓰면 에러가 아니라 **조용한 무효**다 (파일은 생기고 모델은 못 본다).
 *
 * @param cwd - CWD 절대 경로 (vault 경로)
 * @param input - 도구 입력
 */
export function handleClaudeMdMerge(
  cwd: string,
  input: ClaudeMdMergeInput,
): ClaudeMdMergeResult {
  const manager = createProjectInstructionManager(cwd);
  const inspection = manager.inspect();
  const plan = manager.plan({
    content: input.content,
    replaceDrift: true,
    backup: 'sibling',
  });
  const result = input.dry_run ? null : manager.apply(plan);
  const action = (result ?? plan).outcomes[0]?.action;
  const changed =
    action === 'copy' || action === 'update' || action === 'relocate';
  const backupPath = result?.backupPaths[0];

  return {
    changed,
    had_existing_section: inspection.status === 'present',
    ...(backupPath === undefined ? {} : { backup_path: backupPath }),
    section_content: input.content.trim(),
  };
}
