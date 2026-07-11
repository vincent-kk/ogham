/**
 * @file types.ts
 * @description changelogDebt 타입 — 훅 I/O 와 porcelain 파싱 엔트리.
 */
export interface ChangelogDebtInput {
  session_id?: string;
  cwd?: string;
}

export interface ChangelogDebtResult {
  continue: boolean;
}

export interface PorcelainEntry {
  /** XY 상태 코드 (공백 trim 후, 예: 'M', '??', 'R') */
  status: string;
  path: string;
}
