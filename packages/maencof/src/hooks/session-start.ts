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
import { appendDailynoteEntry, formatTime } from '../core/dailynote-writer.js';
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

  // 7. Record session start in dailynote
  try {
    const sessionId = input.session_id ?? 'unknown';
    appendDailynoteEntry(cwd, {
      time: formatTime(new Date()),
      category: 'session',
      description: `Session started (session_id: ${sessionId})`,
    });
  } catch {
    // Silent fallback — dailynote 기록 실패는 세션 시작에 영향 없음
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
      messages.push('[maencof] maencof directives initialized in CLAUDE.md.');
    } else if (vaultVersion === null) {
      // 마커 있음 + version.json 없음 → version.json 생성 (기존 vault 호환)
      writeVaultVersion(cwd, VERSION);
    } else if (vaultVersion !== VERSION) {
      // 마커 있음 + 다른 버전 → 업데이트
      const directive = buildDefaultDirective(cwd, companionName);
      mergeMaencofSection(filePath, directive, { createIfMissing: false });
      updateVaultVersion(cwd, vaultVersion);
      messages.push(
        `[maencof] CLAUDE.md directives updated (${vaultVersion} → ${VERSION}).`,
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
    const data = JSON.parse(
      readFileSync(versionPath, 'utf-8'),
    ) as VaultVersionInfo;
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
        `[maencof] Plugin updated (${vaultVersion} → ${VERSION}).` +
          '\nRun `/maencof:setup` to complete the migration.',
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
- Path: ${cwd}
- Model: 5-Layer (Core/Derived/External/Action/Context)

## Required Rules (MUST)

- When searching vault documents MUST use \`kg_search\` or \`kg_navigate\`. Do not search vault files directly with Grep or Read.
- When reading vault documents MUST use \`maencof_read\`. Do not read vault markdown files directly with the Read tool.
- When recording new knowledge to vault MUST use \`maencof_create\`. Do not create files directly in the vault with the Write tool.
- When modifying vault documents MUST use \`maencof_update\`. Do not edit vault markdown files directly with the Edit tool.
- When learning new information MUST use \`kg_suggest_links\` to check for connection possibilities with existing knowledge.
- When creating documents MUST specify layer and tags.

## Forbidden Rules (FORBIDDEN)

- FORBIDDEN: Directly using Read, Write, Edit, Grep, Glob tools on markdown files within the vault path
- FORBIDDEN: Directly modifying L1_Core documents (must go through the identity-guardian agent)
- FORBIDDEN: Directly modifying the .maencof/ or .maencof-meta/ directories

## Tool Mapping

| Action | Use | Do NOT Use |
|---|---|---|
| Search vault documents | kg_search, kg_navigate | Grep, Glob |
| Read vault documents | maencof_read | Read |
| Create vault documents | maencof_create | Write |
| Update vault documents | maencof_update | Edit |
| Delete vault documents | maencof_delete | Bash rm |
| Move vault documents | maencof_move | Bash mv |
| Check vault status | kg_status | ls, find |
| Assemble context | kg_context | Manual file assembly |
| Modify CLAUDE.md | claudemd_merge | Edit (MAENCOF section) |

## Skills

| Skill | Purpose |
|---|---|
| /maencof:remember | Record new knowledge |
| /maencof:recall | Search past knowledge |
| /maencof:explore | Explore knowledge graph |
| /maencof:organize | Organize/review knowledge |
| /maencof:reflect | Reflect on knowledge |`;
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
