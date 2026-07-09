/**
 * @file types.ts
 * @description errorLog 공개 타입 — 로그 항목 형태.
 */
export interface ErrorLogEntry {
  hook: string;
  error: string;
  timestamp: string;
}
