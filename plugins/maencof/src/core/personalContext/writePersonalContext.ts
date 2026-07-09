/**
 * @file writePersonalContext.ts
 * @description personal-context.json 직렬화 저장 (meta 디렉터리 보장 포함).
 *
 * 임시 파일에 먼저 쓴 뒤 rename으로 원자적으로 교체한다 — 쓰기 중단(크래시)에도
 * 대상 파일이 torn(반쪽) 상태로 남지 않는다.
 */
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { PersonalContextFile } from '../../types/personalContext.js';

import { personalContextPath } from './personalContextPath.js';

export function writePersonalContext(
  cwd: string,
  model: PersonalContextFile,
): void {
  const filePath = personalContextPath(cwd);
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tempPath = `${filePath}.temp`;
  writeFileSync(tempPath, JSON.stringify(model), 'utf-8');
  renameSync(tempPath, filePath);
}
