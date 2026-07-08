/**
 * @file writePersonalContext.ts
 * @description personal-context.json 직렬화 저장 (meta 디렉터리 보장 포함).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { PersonalContextFile } from '../../types/personalContext.js';

import { personalContextPath } from './readPersonalContext.js';

export function writePersonalContext(cwd: string, model: PersonalContextFile): void {
  const filePath = personalContextPath(cwd);
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(model), 'utf-8');
}
