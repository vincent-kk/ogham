/**
 * @file readPersonalContext.ts
 * @description personal-context.json 로드 — 결측/손상 시 default envelope 반환 (graceful).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MAENCOF_META_DIR } from '../../constants/directories.js';
import { PERSONAL_CONTEXT_FILE } from '../../constants/personalContext.js';
import type { PersonalContextFile } from '../../types/personalContext.js';

import { defaultPersonalContext, normalizePersonalContext } from './normalizePersonalContext.js';

export function personalContextPath(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, PERSONAL_CONTEXT_FILE);
}

export function readPersonalContext(cwd: string): PersonalContextFile {
  const filePath = personalContextPath(cwd);
  if (!existsSync(filePath)) return defaultPersonalContext();
  try {
    return normalizePersonalContext(JSON.parse(readFileSync(filePath, 'utf-8')));
  } catch {
    return defaultPersonalContext();
  }
}
