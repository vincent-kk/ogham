/**
 * @file claudemdMerge.ts
 * @description claudemd_merge 도구 핸들러 — CWD의 호스트 지침 문서에 maencof 섹션 삽입/업데이트
 */
import { join } from 'node:path';

import { instructionsFile } from '@ogham/cross-platform/host-paths';

import { mergeMaencofSection } from '../../../core/claudeMdMerger/index.js';
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
  const targetPath = join(cwd, instructionsFile());
  const result = mergeMaencofSection(targetPath, input.content, {
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
