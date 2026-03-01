/**
 * @file claude-md-merger.ts
 * @description CLAUDE.md 마커 기반 스마트 머지
 *
 * 마커: <!-- MAENCOF:START --> ... <!-- MAENCOF:END -->
 * - 마커 외부 기존 내용 보존
 * - 마커 내부만 업데이트
 * - 마커 없으면 파일 끝에 추가
 * - 수정 전 .bak 백업 생성
 *
 * VaultScanner와 동급의 파일시스템 I/O 예외 모듈.
 * 여러 스킬(setup, doctor, rebuild)에서 재사용.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

/** maencof 섹션 시작 마커 */
export const MAENCOF_START_MARKER = '<!-- MAENCOF:START -->';

/** maencof 섹션 종료 마커 */
export const MAENCOF_END_MARKER = '<!-- MAENCOF:END -->';

/** 머지 결과 */
export interface MergeResult {
  /** 실제 파일이 변경되었는지 여부 */
  changed: boolean;
  /** 기존 maencof 섹션이 있었는지 여부 */
  hadExistingSection: boolean;
  /** 백업 파일 경로 (변경이 발생한 경우) */
  backupPath?: string;
  /** 최종 파일 내용 */
  content: string;
}

/**
 * CLAUDE.md에 maencof 섹션을 삽입하거나 업데이트
 *
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
    if (!createIfMissing) {
      return {
        changed: false,
        hadExistingSection: false,
        content: maencofBlock,
      };
    }

    const newContent = maencofBlock + '\n';
    if (!dryRun) {
      writeFileSync(filePath, newContent, 'utf-8');
    }
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
  if (newContent === original) {
    return {
      changed: false,
      hadExistingSection,
      content: original,
    };
  }

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

/**
 * CLAUDE.md에서 maencof 섹션만 읽기
 *
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

/**
 * CLAUDE.md에서 maencof 섹션 제거
 *
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

/**
 * CLAUDE.md 머지 클래스 (설정 보관)
 */
export class ClaudeMdMerger {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /** maencof 섹션 삽입/업데이트 */
  merge(maencofContent: string, options?: { dryRun?: boolean }): MergeResult {
    return mergeMaencofSection(this.filePath, maencofContent, options);
  }

  /** maencof 섹션 읽기 */
  read(): string | null {
    return readMaencofSection(this.filePath);
  }

  /** maencof 섹션 제거 */
  remove(options?: { dryRun?: boolean }): boolean {
    return removeMaencofSection(this.filePath, options);
  }

  /** maencof 섹션 존재 여부 */
  hasSection(): boolean {
    return this.read() !== null;
  }
}
