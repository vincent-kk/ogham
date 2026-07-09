/**
 * @file readMaencofSection.ts
 * @description CLAUDE.md에서 maencof 섹션만 읽기.
 */
import { existsSync, readFileSync } from 'node:fs';

import {
  MAENCOF_END_MARKER,
  MAENCOF_START_MARKER,
} from '../../../constants/markers.js';

/**
 * @param filePath - CLAUDE.md 절대 경로
 * @returns maencof 섹션 내용 (마커 제외), 없으면 null
 */
export function readMaencofSection(filePath: string): string | null {
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, 'utf-8');
  const startIdx = content.indexOf(MAENCOF_START_MARKER);
  const endIdx = content.indexOf(MAENCOF_END_MARKER);

  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return null;

  const sectionStart = startIdx + MAENCOF_START_MARKER.length;
  return content.slice(sectionStart, endIdx).trim();
}
