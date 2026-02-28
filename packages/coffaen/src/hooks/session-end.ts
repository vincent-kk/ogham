/**
 * @file session-end.ts
 * @description SessionEnd Hook — 세션 요약 저장 + 30일 초과 세션 파일 정리
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { coffaenPath, isCoffaenVault, metaPath } from './shared.js';

export interface SessionEndInput {
  session_id?: string;
  cwd?: string;
  /**
   * Skills invoked during the session.
   * NOTE: Claude Code SessionEnd hook does NOT provide this field.
   * It always defaults to [] — reserved for future use.
   */
  skills_used?: string[];
  /**
   * Files modified during the session.
   * NOTE: Claude Code SessionEnd hook does NOT provide this field.
   * It always defaults to [] — reserved for future use.
   */
  files_modified?: string[];
}

export interface SessionEndResult {
  continue: boolean;
}

/** 세션 파일 보관 기간 (일) */
const SESSION_RETENTION_DAYS = 30;

/**
 * SessionEnd Hook 핸들러.
 * 1. 현재 세션 요약을 .coffaen-meta/sessions/{timestamp}.md에 저장
 * 2. 30일 초과 세션 파일 정리
 */
export function runSessionEnd(input: SessionEndInput): SessionEndResult {
  const cwd = input.cwd ?? process.cwd();

  if (!isCoffaenVault(cwd)) {
    return { continue: true };
  }

  const sessionsDir = metaPath(cwd, 'sessions');
  ensureDir(sessionsDir);

  // 세션 요약 저장
  const summary = buildSessionSummary(input, cwd);
  const fileName = buildSessionFileName();
  const filePath = join(sessionsDir, fileName);

  try {
    writeFileSync(filePath, summary, 'utf-8');
  } catch {
    // 저장 실패 시 무시 (세션 종료를 막지 않음)
  }

  // 오래된 세션 파일 정리
  cleanOldSessions(sessionsDir);

  return { continue: true };
}

/**
 * 세션 요약 마크다운 문자열을 생성한다.
 * usage-stats.json (누적 통계)과 stale-nodes.json을 읽어 실제 활동 데이터를 포함한다.
 */
function buildSessionSummary(input: SessionEndInput, cwd: string): string {
  const now = new Date().toISOString();
  const sessionId = input.session_id ?? 'unknown';

  const lines: string[] = [
    `# 세션 요약`,
    ``,
    `- **세션 ID**: ${sessionId}`,
    `- **종료 시각**: ${now}`,
    ``,
  ];

  // usage-stats.json 읽기 (누적 통계)
  const usageStats = readJsonSafe<Record<string, number>>(
    metaPath(cwd, 'usage-stats.json'),
  );

  // stale-nodes.json 읽기
  const staleNodes = readJsonSafe<{ paths: string[]; updatedAt: string }>(
    coffaenPath(cwd, 'stale-nodes.json'),
  );

  const hasUsageStats =
    usageStats !== null && Object.keys(usageStats).length > 0;
  const hasStaleNodes =
    staleNodes !== null &&
    Array.isArray(staleNodes.paths) &&
    staleNodes.paths.length > 0;

  if (hasUsageStats) {
    lines.push(`## Vault 도구 사용 현황 (누적)`);
    lines.push(``);
    for (const [tool, count] of Object.entries(usageStats!)) {
      lines.push(`- ${tool}: ${count}회`);
    }
    lines.push(``);
  }

  if (hasStaleNodes) {
    lines.push(`## 대기 중인 인덱스 갱신 (stale nodes)`);
    lines.push(``);
    for (const path of staleNodes!.paths) {
      lines.push(`- ${path}`);
    }
    lines.push(``);
  }

  if (!hasUsageStats && !hasStaleNodes) {
    lines.push(`> 이 세션에서 기록된 활동이 없습니다.`);
    lines.push(``);
  }

  if (hasUsageStats || hasStaleNodes) {
    lines.push(`> 정확한 세션 단위 통계는 향후 개선 예정입니다.`);
    lines.push(``);
  }

  return lines.join('\n');
}

/**
 * JSON 파일을 안전하게 읽는다. 파일이 없거나 파싱 실패 시 null을 반환한다.
 */
function readJsonSafe<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

/**
 * 세션 파일 이름을 생성한다 (YYYY-MM-DD-HHmmss.md).
 */
function buildSessionFileName(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${HH}${min}${ss}.md`;
}

/**
 * sessions/ 디렉토리에서 30일 초과 세션 파일을 삭제한다.
 */
function cleanOldSessions(sessionsDir: string): void {
  if (!existsSync(sessionsDir)) return;

  const cutoffMs = SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  try {
    const files = readdirSync(sessionsDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const filePath = join(sessionsDir, file);
      try {
        const stat = statSync(filePath);
        if (now - stat.mtimeMs > cutoffMs) {
          unlinkSync(filePath);
        }
      } catch {
        // 개별 파일 처리 실패 시 무시
      }
    }
  } catch {
    // 디렉토리 읽기 실패 시 무시
  }
}

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}
