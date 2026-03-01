/**
 * @file session-start.ts
 * @description SessionStart Hook — Knowledge tree check, WAL recovery detection, schedule review, previous session summary load
 * C1 constraint: Must complete within 5 seconds. Heavy index builds are delegated to Skills.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  mergeMaencofSection,
  readMaencofSection,
} from '../core/claude-md-merger.js';
import type { CompanionIdentityMinimal } from '../types/companion-guard.js';
import { isValidCompanionIdentity } from '../types/companion-guard.js';
import type { VaultVersionInfo } from '../types/setup.js';
import { VERSION } from '../version.js';
import { claudeMdPath, isMaencofVault, metaPath } from './shared.js';

export interface SessionStartInput {
  session_id?: string;
  cwd?: string;
}

export interface SessionStartResult {
  continue: boolean;
  suppressOutput?: boolean;
  /** Message to display to the user */
  message?: string;
}

/**
 * SessionStart Hook handler.
 * 1. Check .maencof/ directory exists → prompt setup if missing
 * 2. Load companion identity → display greeting
 * 3. Detect leftover WAL → suggest recovery
 * 4. Check schedule-log.json → suggest organize skill
 * 5. Load recent session summary → display previous context
 * 6. Check data-sources.json → suggest connect if missing
 */
export function runSessionStart(input: SessionStartInput): SessionStartResult {
  const cwd = input.cwd ?? process.cwd();
  const messages: string[] = [];

  // 1. Check maencof vault
  if (!isMaencofVault(cwd)) {
    return {
      continue: true,
      message:
        '[maencof] Vault is not initialized. Run `/maencof:setup` to get started.',
    };
  }

  // 2. Load companion identity
  const companion = loadCompanionIdentity(cwd);
  if (companion) {
    messages.push(`[maencof:${companion.name}] ${companion.greeting}`);
  }

  // 2.5. CLAUDE.md maencof 섹션 초기화 (조건부 경량 쓰기, version.json 기반)
  initClaudeMdSection(cwd, companion?.name, messages);

  // 2.6. 버전 불일치 감지
  checkVersionMismatch(cwd, messages);

  // 3. Detect leftover WAL
  const walPath = metaPath(cwd, 'wal.json');
  if (existsSync(walPath)) {
    messages.push(
      '[maencof] Incomplete transaction (WAL) detected from a previous session. Run `/maencof:doctor` to diagnose.',
    );
  }

  // 4. Check schedule-log.json
  const scheduleLogPath = metaPath(cwd, 'schedule-log.json');
  if (existsSync(scheduleLogPath)) {
    try {
      const log = JSON.parse(readFileSync(scheduleLogPath, 'utf-8')) as {
        pending?: unknown[];
      };
      if (log.pending && log.pending.length > 0) {
        messages.push(
          `[maencof] ${log.pending.length} pending task(s) found. Run \`/maencof:organize\` to process.`,
        );
      }
    } catch {
      // Ignore schedule-log.json parse failures
    }
  }

  // 5. Load recent session summary
  const sessionsDir = metaPath(cwd, 'sessions');
  if (existsSync(sessionsDir)) {
    const recentSummary = loadRecentSessionSummary(sessionsDir);
    if (recentSummary) {
      messages.push(`[maencof] Previous session summary:\n${recentSummary}`);
    }
  }

  // 6. Check data-sources.json
  const dataSourcesPath = metaPath(cwd, 'data-sources.json');
  if (!existsSync(dataSourcesPath)) {
    messages.push(
      '[maencof] No external data sources connected. Run `/maencof:connect` to set up.',
    );
  }

  return {
    continue: true,
    message: messages.length > 0 ? messages.join('\n\n') : undefined,
  };
}

/**
 * Load companion identity from .maencof-meta/companion-identity.json.
 * Uses manual type guard (no Zod) to keep hook bundle small.
 * Graceful degradation: returns null on any failure.
 */
function loadCompanionIdentity(
  cwd: string,
): Pick<CompanionIdentityMinimal, 'name' | 'greeting'> | null {
  const identityPath = metaPath(cwd, 'companion-identity.json');
  if (!existsSync(identityPath)) return null;
  try {
    const raw: unknown = JSON.parse(readFileSync(identityPath, 'utf-8'));
    return isValidCompanionIdentity(raw)
      ? { name: raw.name, greeting: raw.greeting }
      : null;
  } catch {
    return null;
  }
}

/**
 * CLAUDE.md maencof 섹션 초기화 (version.json 기반 조건부 쓰기).
 *
 * 판단 로직:
 * - 마커 없음 → 삽입 + version.json 갱신
 * - 마커 있음 + version.json.version === VERSION → 스킵 (idempotent)
 * - 마커 있음 + version.json.version !== VERSION → mergeMaencofSection()으로 업데이트
 * - 마커 있음 + version.json 없음 → version.json 생성 (기존 vault 호환)
 *
 * 실패 시 silent fallback (hook 실패로 전파하지 않음)
 */
function initClaudeMdSection(
  cwd: string,
  companionName: string | undefined,
  messages: string[],
): void {
  try {
    const filePath = claudeMdPath(cwd);
    const existing = readMaencofSection(filePath);
    const vaultVersion = readVaultVersion(cwd);

    if (existing === null) {
      // 마커 없음 → 삽입
      const directive = buildDefaultDirective(cwd, companionName);
      mergeMaencofSection(filePath, directive, { createIfMissing: true });
      writeVaultVersion(cwd, VERSION);
      messages.push(
        '[maencof] CLAUDE.md에 maencof 지시문이 초기화되었습니다.',
      );
    } else if (vaultVersion === null) {
      // 마커 있음 + version.json 없음 → version.json 생성 (기존 vault 호환)
      writeVaultVersion(cwd, VERSION);
    } else if (vaultVersion !== VERSION) {
      // 마커 있음 + 다른 버전 → 업데이트
      const directive = buildDefaultDirective(cwd, companionName);
      mergeMaencofSection(filePath, directive, { createIfMissing: false });
      updateVaultVersion(cwd, vaultVersion);
      messages.push(
        `[maencof] CLAUDE.md 지시문이 업데이트되었습니다 (${vaultVersion} → ${VERSION}).`,
      );
    }
    // 마커 있음 + 같은 버전 → 스킵 (idempotent)
  } catch {
    // Silent fallback — hook 실패로 전파하지 않음
  }
}

/**
 * version.json에서 플러그인 버전을 읽는다.
 * 파일이 없거나 파싱 실패 시 null을 반환한다.
 */
function readVaultVersion(cwd: string): string | null {
  const versionPath = metaPath(cwd, 'version.json');
  if (!existsSync(versionPath)) return null;
  try {
    const data = JSON.parse(readFileSync(versionPath, 'utf-8')) as VaultVersionInfo;
    return data.version ?? null;
  } catch {
    return null;
  }
}

/**
 * version.json을 생성한다 (최초 설치).
 */
function writeVaultVersion(cwd: string, version: string): void {
  const versionPath = metaPath(cwd, 'version.json');
  const info: VaultVersionInfo = {
    version,
    installedAt: new Date().toISOString(),
    migrationHistory: [],
  };
  writeFileSync(versionPath, JSON.stringify(info, null, 2), 'utf-8');
}

/**
 * version.json을 업데이트한다 (마이그레이션).
 */
function updateVaultVersion(cwd: string, previousVersion: string): void {
  const versionPath = metaPath(cwd, 'version.json');
  let info: VaultVersionInfo;
  try {
    info = JSON.parse(readFileSync(versionPath, 'utf-8')) as VaultVersionInfo;
  } catch {
    info = {
      version: previousVersion,
      installedAt: new Date().toISOString(),
      migrationHistory: [],
    };
  }
  info.migrationHistory.push(`${previousVersion} -> ${VERSION}`);
  info.version = VERSION;
  info.lastMigratedAt = new Date().toISOString();
  writeFileSync(versionPath, JSON.stringify(info, null, 2), 'utf-8');
}

/**
 * 플러그인 버전과 vault의 version.json이 불일치하면 안내 메시지를 추가한다.
 * initClaudeMdSection()에서 자동 업데이트가 처리되지 않은 경우의 fallback.
 */
function checkVersionMismatch(cwd: string, messages: string[]): void {
  try {
    const vaultVersion = readVaultVersion(cwd);
    if (vaultVersion !== null && vaultVersion !== VERSION) {
      messages.push(
        `[maencof] 플러그인이 업데이트되었습니다 (${vaultVersion} → ${VERSION}).` +
        '\n`/maencof:setup`을 실행하여 마이그레이션을 완료하세요.',
      );
    }
  } catch {
    // Silent fallback
  }
}

/**
 * 기본 maencof 지시문 템플릿을 생성한다.
 */
function buildDefaultDirective(cwd: string, companionName?: string): string {
  const header = companionName
    ? `# maencof Knowledge Space (${companionName})`
    : '# maencof Knowledge Space';

  return `${header}

## Vault
- 경로: ${cwd}
- 모델: 5-Layer (Core/Derived/External/Action/Context)

## 필수 규칙 (MUST)

- vault 내 문서를 검색할 때 MUST use \`kg_search\` or \`kg_navigate\`. Grep, Read로 vault 파일을 직접 검색하지 마세요.
- vault 내 문서를 읽을 때 MUST use \`maencof_read\`. Read 도구로 vault 마크다운 파일을 직접 읽지 마세요.
- vault에 새 지식을 기록할 때 MUST use \`maencof_create\`. Write 도구로 vault에 직접 파일을 생성하지 마세요.
- vault 문서를 수정할 때 MUST use \`maencof_update\`. Edit 도구로 vault 마크다운 파일을 직접 수정하지 마세요.
- 새 정보를 학습하면 MUST use \`kg_suggest_links\`로 기존 지식과의 연결 가능성을 확인하세요.
- 문서 생성 시 MUST specify layer와 tags.

## 금지 규칙 (FORBIDDEN)

- FORBIDDEN: vault 경로 내 마크다운 파일에 대해 Read, Write, Edit, Grep, Glob 도구를 직접 사용하는 것
- FORBIDDEN: L1_Core 문서를 직접 수정하는 것 (identity-guardian 에이전트를 통해야 함)
- FORBIDDEN: .maencof/ 또는 .maencof-meta/ 디렉토리를 직접 수정하는 것

## 도구 매핑

| 하고 싶은 일 | 사용할 도구 | 사용하지 말 것 |
|---|---|---|
| vault 문서 검색 | kg_search, kg_navigate | Grep, Glob |
| vault 문서 읽기 | maencof_read | Read |
| vault 문서 생성 | maencof_create | Write |
| vault 문서 수정 | maencof_update | Edit |
| vault 문서 삭제 | maencof_delete | Bash rm |
| vault 문서 이동 | maencof_move | Bash mv |
| vault 상태 확인 | kg_status | ls, find |
| 맥락 조합 | kg_context | 수동 파일 조합 |
| CLAUDE.md 수정 | claudemd_merge | Edit (MAENCOF 영역) |

## 스킬

| 스킬 | 용도 |
|---|---|
| /maencof:remember | 새 지식 기록 |
| /maencof:recall | 과거 지식 검색 |
| /maencof:explore | 지식 그래프 탐색 |
| /maencof:organize | 지식 정리/리뷰 |
| /maencof:reflect | 지식 회고 |`;
}

/**
 * Load the most recent session summary from the sessions/ directory.
 */
function loadRecentSessionSummary(sessionsDir: string): string | null {
  try {
    const files = readdirSync(sessionsDir)
      .filter((f: string) => f.endsWith('.md'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const latestFile = join(sessionsDir, files[0]);
    const content = readFileSync(latestFile, 'utf-8');

    // Extract summary section (first 10 lines)
    const lines = content.split('\n').slice(0, 10).join('\n');
    return lines.trim() || null;
  } catch {
    return null;
  }
}
