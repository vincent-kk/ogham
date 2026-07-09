/**
 * @file removeMaencofSection.ts
 * @description CLAUDE.md에서 maencof 섹션 제거.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

import {
  MAENCOF_END_MARKER,
  MAENCOF_START_MARKER,
} from '../../../constants/markers.js';

/**
 * @param filePath - CLAUDE.md 절대 경로
 * @param options - 옵션
 * @returns 제거 성공 여부
 */
export function removeMaencofSection(
  filePath: string,
  options: { dryRun?: boolean } = {},
): boolean {
  const { dryRun = false } = options;

  if (!existsSync(filePath)) return false;

  const content = readFileSync(filePath, 'utf-8');
  const startIdx = content.indexOf(MAENCOF_START_MARKER);
  const endIdx = content.indexOf(MAENCOF_END_MARKER);

  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return false;

  const before = content.slice(0, startIdx).trimEnd();
  const after = content.slice(endIdx + MAENCOF_END_MARKER.length).trimStart();
  const newContent = before + (before && after ? '\n\n' : '') + after;

  if (!dryRun) {
    const backupPath = filePath + '.bak';
    copyFileSync(filePath, backupPath);
    writeFileSync(filePath, newContent, 'utf-8');
  }

  return true;
}
