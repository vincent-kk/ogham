/**
 * @file readPersonalContext.ts
 * @description personal-context.json 로드 — 결측/손상 시 default envelope 반환 (graceful).
 *
 * 구조 손상(merge 충돌 마커·torn write)과 일시적 IO 오류를 구분한다: 파싱
 * 실패면 원본 바이트를 `.corrupt`로 보존한 뒤 default를 반환해, 후속 write가
 * 복구 가능한 데이터(항목·disable 설정)를 조용히 덮어쓰는 것을 막는다.
 */
import { existsSync, readFileSync, renameSync } from 'node:fs';

import type { PersonalContextFile } from '../../types/personalContext.js';

import { defaultPersonalContext } from './defaultPersonalContext.js';
import { normalizePersonalContext } from './normalizePersonalContext.js';
import { personalContextPath } from './personalContextPath.js';

export function readPersonalContext(cwd: string): PersonalContextFile {
  const filePath = personalContextPath(cwd);
  if (!existsSync(filePath)) return defaultPersonalContext();

  let text: string;
  try {
    text = readFileSync(filePath, 'utf-8');
  } catch {
    return defaultPersonalContext(); // 일시적 IO 오류 — 파일은 건드리지 않는다
  }

  try {
    return normalizePersonalContext(JSON.parse(text));
  } catch {
    // 구조 손상: 다음 write가 silent clobber하지 못하도록 원본을 옆으로 보존.
    try {
      renameSync(filePath, `${filePath}.corrupt`);
    } catch {
      /* best-effort — 보존 실패해도 default로 진행 */
    }
    return defaultPersonalContext();
  }
}
