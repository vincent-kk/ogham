/**
 * @file session-end.ts
 * @description SessionEnd Hook — 세션 요약 저장 + 30일 초과 세션 파일 정리
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { isCoffaenVault, metaPath } from './shared.js';

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
  const summary = buildSessionSummary(input);
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
 */
function buildSessionSummary(input: SessionEndInput): string {
  const now = new Date().toISOString();
  const sessionId = input.session_id ?? 'unknown';
  const skillsUsed = input.skills_used ?? [];
  const filesModified = input.files_modified ?? [];

  const lines: string[] = [
    `# 세션 요약`,
    ``,
    `- **세션 ID**: ${sessionId}`,
    `- **종료 시각**: ${now}`,
    ``,
  ];

  if (skillsUsed.length > 0) {
    lines.push(`## 사용된 스킬`);
    lines.push(``);
    for (const skill of skillsUsed) {
      lines.push(`- ${skill}`);
    }
    lines.push(``);
  }

  if (filesModified.length > 0) {
    lines.push(`## 수정된 문서`);
    lines.push(``);
    for (const file of filesModified) {
      lines.push(`- ${file}`);
    }
    lines.push(``);
  }

  if (skillsUsed.length === 0 && filesModified.length === 0) {
    lines.push(`> 이 세션에서 기록된 활동이 없습니다.`);
    lines.push(``);
  }

  return lines.join('\n');
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
