/**
 * @file claudemdRead.ts
 * @description claudemd_read 도구 핸들러 — CWD의 호스트 지침 문서에서 maencof 섹션 읽기
 */
import { createProjectInstructionManager } from '../../../core/claudeMdMerger/index.js';
import type { ClaudeMdReadResult } from '../../../types/mcp.js';

/**
 * claudemd_read 핸들러
 *
 * 대상 파일은 호스트가 정한다 (Claude=`CLAUDE.md` · Codex=`AGENTS.md`) — 병합한 쪽에서 읽는다.
 *
 * @param cwd - CWD 절대 경로 (vault 경로)
 */
export function handleClaudeMdRead(cwd: string): ClaudeMdReadResult {
  const inspection = createProjectInstructionManager(cwd).inspect();
  return {
    exists: inspection.status === 'present',
    content: inspection.status === 'present' ? inspection.sectionContent : null,
    file_exists: inspection.targetExists,
  };
}
