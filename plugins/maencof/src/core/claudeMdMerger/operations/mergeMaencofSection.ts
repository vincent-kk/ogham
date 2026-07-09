/**
 * @file mergeMaencofSection.ts
 * @description CLAUDE.md 마커 기반 스마트 머지 — maencof 섹션 삽입/업데이트.
 *
 * 마커: <!-- MAENCOF:START --> ... <!-- MAENCOF:END -->
 * - 마커 외부 기존 내용 보존
 * - 마커 내부만 업데이트
 * - 마커 없으면 파일 끝에 추가
 * - 수정 전 .bak 백업 생성
 *
 * VaultScanner와 동급의 파일시스템 I/O 예외 모듈.
 * 여러 스킬(setup, checkup, rebuild)에서 재사용.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

import {
  MAENCOF_END_MARKER,
  MAENCOF_START_MARKER,
} from '../../../constants/markers.js';
import type { MergeResult } from '../types/types.js';

/**
 * @param filePath - CLAUDE.md 절대 경로
 * @param maencofContent - MAENCOF 마커 사이에 삽입할 내용 (마커 제외)
 * @param options - 옵션
 * @returns 머지 결과
 */
export function mergeMaencofSection(
  filePath: string,
  maencofContent: string,
  options: { dryRun?: boolean; createIfMissing?: boolean } = {},
): MergeResult {
  const { dryRun = false, createIfMissing = true } = options;

  // maencof 섹션 블록 생성
  const maencofBlock = [
    MAENCOF_START_MARKER,
    maencofContent.trim(),
    MAENCOF_END_MARKER,
  ].join('\n');

  // 파일이 없는 경우
  if (!existsSync(filePath)) {
    if (!createIfMissing)
      return {
        changed: false,
        hadExistingSection: false,
        content: maencofBlock,
      };

    const newContent = maencofBlock + '\n';
    if (!dryRun) writeFileSync(filePath, newContent, 'utf-8');

    return {
      changed: true,
      hadExistingSection: false,
      content: newContent,
    };
  }

  // 기존 파일 읽기
  const original = readFileSync(filePath, 'utf-8');

  const startIdx = original.indexOf(MAENCOF_START_MARKER);
  const endIdx = original.indexOf(MAENCOF_END_MARKER);

  let newContent: string;
  let hadExistingSection: boolean;

  if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
    // 기존 maencof 섹션 교체
    hadExistingSection = true;
    const before = original.slice(0, startIdx);
    const after = original.slice(endIdx + MAENCOF_END_MARKER.length);
    newContent = before + maencofBlock + after;
  } else {
    // 마커 없음 — 파일 끝에 추가
    hadExistingSection = false;
    const separator = original.endsWith('\n') ? '\n' : '\n\n';
    newContent = original + separator + maencofBlock + '\n';
  }

  // 변경 없으면 파일 쓰기 건너뜀
  if (newContent === original)
    return {
      changed: false,
      hadExistingSection,
      content: original,
    };

  let backupPath: string | undefined;
  if (!dryRun) {
    // 백업 생성
    backupPath = filePath + '.bak';
    copyFileSync(filePath, backupPath);
    // 새 내용 쓰기
    writeFileSync(filePath, newContent, 'utf-8');
  }

  return {
    changed: true,
    hadExistingSection,
    backupPath,
    content: newContent,
  };
}
