/**
 * @file claudemdRead.ts
 * @description claudemd_read 도구 핸들러 — CWD의 호스트 지침 문서에서 maencof 섹션 읽기
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { instructionsFile } from '@ogham/cross-platform/host-paths';

import { readMaencofSection } from '../../../core/claudeMdMerger/index.js';
import type { ClaudeMdReadResult } from '../../../types/mcp.js';

/**
 * claudemd_read 핸들러
 *
 * 대상 파일은 호스트가 정한다 (Claude=`CLAUDE.md` · Codex=`AGENTS.md`) — 병합한 쪽에서 읽는다.
 *
 * @param cwd - CWD 절대 경로 (vault 경로)
 */
export function handleClaudeMdRead(cwd: string): ClaudeMdReadResult {
  const targetPath = join(cwd, instructionsFile());
  const fileExists = existsSync(targetPath);

  if (!fileExists) return { exists: false, content: null, file_exists: false };

  const content = readMaencofSection(targetPath);
  return {
    exists: content !== null,
    content,
    file_exists: true,
  };
}
