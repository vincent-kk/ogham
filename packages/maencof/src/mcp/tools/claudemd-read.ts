/**
 * @file claudemd-read.ts
 * @description claudemd_read 도구 핸들러 — CWD의 CLAUDE.md에서 maencof 섹션 읽기
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { readMaencofSection } from '../../core/claude-md-merger.js';
import type { ClaudeMdReadResult } from '../../types/mcp.js';

/**
 * claudemd_read 핸들러
 *
 * @param cwd - CWD 절대 경로 (vault 경로)
 */
export function handleClaudeMdRead(cwd: string): ClaudeMdReadResult {
  const claudeMdPath = join(cwd, 'CLAUDE.md');
  const fileExists = existsSync(claudeMdPath);

  if (!fileExists) {
    return { exists: false, content: null, file_exists: false };
  }

  const content = readMaencofSection(claudeMdPath);
  return {
    exists: content !== null,
    content,
    file_exists: true,
  };
}
