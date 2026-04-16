/**
 * @file session-start.ts
 * @description SessionStart Hook — Knowledge tree check, WAL recovery detection, schedule review, previous session summary load
 * C1 constraint: Must complete within 5 seconds. Heavy index builds are delegated to Skills.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildDefaultDirective } from '../../constants/directive-template.js';
import {
  mergeMaencofSection,
  readMaencofSection,
} from '../../core/claude-md-merger/index.js';
import {
  appendDailynoteEntry,
  formatTime,
} from '../../core/dailynote-writer/index.js';
import { isDialogueInjectionDisabled } from '../../core/dialogue-config/index.js';
import { appendErrorLogSafe } from '../../core/error-log/index.js';
import {
  autoAdjustSensitivity,
  buildMetaPrompt,
  deletePendingNotification,
  readInsightConfig,
  readPendingNotification,
} from '../../core/insight-stats/index.js';
import { EXPECTED_ARCHITECTURE_VERSION } from '../../types/common.js';
import type { CompanionIdentityMinimal } from '../../types/companion-guard.js';
import { isValidCompanionIdentity } from '../../types/companion-guard.js';
import type { VaultVersionInfo } from '../../types/setup.js';
import { VERSION } from '../../version.js';
import { provisionMissingConfigs } from '../config-provisioner/index.js';
import { claudeMdPath, isMaencofVault, metaPath } from '../shared/index.js';

import META_SKILL_BODY from './meta-skill-body.md';

/** Hard upper bound (Unicode code points) for meta-skill body before silent skip. */
const META_SKILL_MAX_CHARS = 2500;
const META_SKILL_TAG = 'maencof-meta-skill';

export interface SessionStartInput {
  session_id?: string;
  cwd?: string;
}

export interface SessionStartHookSpecificOutput {
  hookEventName: 'SessionStart';
  /** Body injected into the model's system context. Wrapped in `<maencof-meta-skill>` tag. */
  additionalContext: string;
}

export interface SessionStartResult {
  continue: boolean;
  suppressOutput?: boolean;
  /** Message to display to the user */
  message?: string;
  /**
   * Claude Code SessionStart hook contract field. When present, `additionalContext`
   * is injected into the model's system context. Used here to deliver the
   * dialogue meta-skill body unless the dialogue off-switch is active.
   */
  hookSpecificOutput?: SessionStartHookSpecificOutput;
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
        '[maencof] Vault is not initialized. Run `/maencof:maencof-setup` to get started.',
    };
  }

  // 2. Load companion identity
  const companion = loadCompanionIdentity(cwd);
  if (companion) {
    messages.push(`[maencof:${companion.name}] ${companion.greeting}`);
  }

  // 2.5. CLAUDE.md maencof 섹션 초기화 (조건부 경량 쓰기, version.json 기반)
  initClaudeMdSection(cwd, companion?.name, messages);

  // 2.8. Config file provisioning + migration — always run regardless of needsProvisioning
  try {
    const provision = provisionMissingConfigs(cwd);
    if (provision.created.length > 0) {
      messages.push(
        `[maencof] Config files provisioned: ${provision.created.join(', ')}`,
      );
    }
    if (provision.migrated.length > 0) {
      messages.push(
        `[maencof] Config schemas updated: ${provision.migrated.join(', ')}`,
      );
    }
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-start',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }

  // 2.6. 아키텍처 버전 체크 (L3 서브레이어 + L5 Buffer/Boundary)
  checkArchitectureMismatch(cwd, messages);

  // 2.7a. 플러그인 버전 불일치 감지
  checkVersionMismatch(cwd, messages);

  // 3. Detect leftover WAL
  const walPath = metaPath(cwd, 'wal.json');
  if (existsSync(walPath)) {
    messages.push(
      '[maencof] Incomplete transaction (WAL) detected from a previous session. Run `/maencof:maencof-checkup` to diagnose.',
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
          `[maencof] ${log.pending.length} pending task(s) found. Run \`/maencof:maencof-organize\` to process.`,
        );
      }
    } catch (e) {
      appendErrorLogSafe(cwd, {
        hook: 'session-start',
        error: String(e),
        timestamp: new Date().toISOString(),
      });
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
  try {
    const dataSourcesRaw = readFileSync(dataSourcesPath, 'utf-8');
    const dataSources = JSON.parse(dataSourcesRaw) as { sources?: unknown[] };
    if (!dataSources.sources || dataSources.sources.length === 0) {
      messages.push(
        '[maencof] No external data sources connected. Run `/maencof:maencof-connect` to set up.',
      );
    }
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-start',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
    messages.push(
      '[maencof] No external data sources connected. Run `/maencof:maencof-connect` to set up.',
    );
  }

  // 6.4. Precision-based sensitivity auto-adjustment
  try {
    const adjustment = autoAdjustSensitivity(cwd);
    if (adjustment.message) {
      messages.push(`[maencof] ${adjustment.message}`);
    }
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-start',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }

  // 6.5. Auto-Insight: meta-prompt injection + pending notification
  try {
    const insightConfig = readInsightConfig(cwd);

    if (insightConfig.enabled) {
      messages.push(buildMetaPrompt(insightConfig));
    }

    const pending = readPendingNotification(cwd);
    if (pending && pending.captures.length > 0) {
      const l2Count = pending.captures.filter((c) => c.layer === 2).length;
      const l5Count = pending.captures.filter((c) => c.layer === 5).length;
      const titles = pending.captures
        .map((c) => `  - L${c.layer}: "${c.title}"`)
        .join('\n');

      messages.push(
        `💡 지난 세션에서 ${pending.captures.length}개 인사이트를 자동 캡처했습니다 (L2: ${l2Count}, L5: ${l5Count}):\n${titles}\n/maencof:maencof-insight --recent 로 확인하세요.`,
      );

      deletePendingNotification(cwd);
    }
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-start',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }

  // 7. Record session start in dailynote
  try {
    const sessionId = input.session_id ?? 'unknown';
    appendDailynoteEntry(cwd, {
      time: formatTime(new Date()),
      category: 'session',
      description: `Session started (session_id: ${sessionId})`,
    });
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-start',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }

  const result: SessionStartResult = {
    continue: true,
    message: messages.length > 0 ? messages.join('\n\n') : undefined,
  };

  // 8. meta-skill SKILL.md injection (off-switch honored)
  try {
    const additionalContext = buildMetaSkillContext(cwd);
    if (additionalContext !== null) {
      result.hookSpecificOutput = {
        hookEventName: 'SessionStart',
        additionalContext,
      };
    }
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-start',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }

  return result;
}

/**
 * Build the `additionalContext` string carrying the maencof dialogue meta-skill body.
 *
 * Returns `null` when:
 *   - the dialogue off-switch is active (env or config)
 *   - the body exceeds META_SKILL_MAX_CHARS (silent skip per plan §4.5)
 *
 * Otherwise wraps the body (bundled inline via esbuild `.md -> text`) in `<maencof-meta-skill>` tags.
 */
function buildMetaSkillContext(cwd: string): string | null {
  if (isDialogueInjectionDisabled(cwd)) return null;
  const body = META_SKILL_BODY;
  if ([...body].length > META_SKILL_MAX_CHARS) return null;
  return `<${META_SKILL_TAG}>\n${body}\n</${META_SKILL_TAG}>`;
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
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-start',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
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
): boolean {
  let needsProvisioning = false;
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
      needsProvisioning = true;
    } else if (vaultVersion === null) {
      // 마커 있음 + version.json 없음 → version.json 생성 (기존 vault 호환)
      writeVaultVersion(cwd, VERSION);
      needsProvisioning = true;
    } else if (vaultVersion !== VERSION) {
      // 마커 있음 + 다른 버전 → 업데이트
      const directive = buildDefaultDirective(cwd, companionName);
      mergeMaencofSection(filePath, directive, { createIfMissing: false });
      updateVaultVersion(cwd, vaultVersion);
      messages.push(
        `[maencof] CLAUDE.md directives updated (${vaultVersion} → ${VERSION}).`,
      );
      needsProvisioning = true;
    }
    // 마커 있음 + 같은 버전 → 스킵 (idempotent)
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-start',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }
  return needsProvisioning;
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
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-start',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
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
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-start',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
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
 * 아키텍처 버전 불일치 시 마이그레이션 안내 메시지를 추가한다.
 * 자동 마이그레이션은 하지 않는다 — 항상 사용자 명시적 실행.
 */
function checkArchitectureMismatch(cwd: string, messages: string[]): void {
  try {
    const versionPath = metaPath(cwd, 'version.json');
    let archVersion = '1.0.0';
    if (existsSync(versionPath)) {
      const data = JSON.parse(
        readFileSync(versionPath, 'utf-8'),
      ) as VaultVersionInfo;
      archVersion = data.architecture_version ?? '1.0.0';
    }
    if (archVersion !== EXPECTED_ARCHITECTURE_VERSION) {
      messages.push(
        `[maencof] Architecture update available (${archVersion} → ${EXPECTED_ARCHITECTURE_VERSION}).` +
          '\nL3 sub-layers (relational/structural/topical) and L5 sub-layers (buffer/boundary) are now supported.' +
          '\nRun `/maencof:maencof-migrate` to upgrade your vault structure.',
      );
    }
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-start',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }
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
          '\nRun `/maencof:maencof-setup` to complete the migration.',
      );
    }
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'session-start',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }
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
