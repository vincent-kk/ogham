/**
 * @file mcp-metadata.ts
 * @description 메타데이터 도구 입출력 스키마 — claudemd_merge, claudemd_read, claudemd_remove
 */

/** claudemd_merge 입력 */
export interface ClaudeMdMergeInput {
  /** 삽입할 maencof 섹션 내용 (마커 제외) */
  content: string;
  /** 드라이런 모드 (기본 false) */
  dry_run?: boolean;
}

/** claudemd_merge 출력 */
export interface ClaudeMdMergeResult {
  /** 파일 변경 여부 */
  changed: boolean;
  /** 기존 섹션 존재 여부 */
  had_existing_section: boolean;
  /** 백업 파일 경로 */
  backup_path?: string;
  /** 최종 maencof 섹션 내용 */
  section_content: string;
}

/** claudemd_read 입력 (파라미터 없음) */
export type ClaudeMdReadInput = Record<string, never>;

/** claudemd_read 출력 */
export interface ClaudeMdReadResult {
  /** maencof 섹션 존재 여부 */
  exists: boolean;
  /** 섹션 내용 (없으면 null) */
  content: string | null;
  /** CLAUDE.md 파일 존재 여부 */
  file_exists: boolean;
}

/** claudemd_remove 입력 */
export interface ClaudeMdRemoveInput {
  /** 드라이런 모드 (기본 false) */
  dry_run?: boolean;
}

/** claudemd_remove 출력 */
export interface ClaudeMdRemoveResult {
  /** 제거 성공 여부 */
  removed: boolean;
  /** 백업 파일 경로 */
  backup_path?: string;
}
