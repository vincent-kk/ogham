/**
 * @file types.ts
 * @description claudeMdMerger 공개 타입 — 머지 결과.
 */
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
