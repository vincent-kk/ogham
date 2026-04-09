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
} from '../../core/claude-md-merger/claude-md-merger.js';
import { appendDailynoteEntry, formatTime } from '../../core/dailynote-writer/dailynote-writer.js';
import {
  buildMetaPrompt,
  deletePendingNotification,
  readInsightConfig,
  readPendingNotification,
} from '../../core/insight-stats/insight-stats.js';
import { EXPECTED_ARCHITECTURE_VERSION } from '../../types/common.js';
import type { CompanionIdentityMinimal } from '../../types/companion-guard.js';
import { isValidCompanionIdentity } from '../../types/companion-guard.js';
import type { VaultVersionInfo } from '../../types/setup.js';
import { VERSION } from '../../version.js';

import { provisionMissingConfigs } from '../config-provisioner/config-provisioner.js';
import { claudeMdPath, isMaencofVault, metaPath } from '../shared/shared.js';

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
  } catch {
    // Silent fallback — provisioning failure must not block session start
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
  try {
    const dataSourcesRaw = readFileSync(dataSourcesPath, 'utf-8');
    const dataSources = JSON.parse(dataSourcesRaw) as { sources?: unknown[] };
    if (!dataSources.sources || dataSources.sources.length === 0) {
      messages.push(
        '[maencof] No external data sources connected. Run `/maencof:maencof-connect` to set up.',
      );
    }
  } catch {
    messages.push(
      '[maencof] No external data sources connected. Run `/maencof:maencof-connect` to set up.',
    );
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
  } catch {
    // Silent — insight injection failure must not block session start
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
  } catch {
    // Silent fallback — hook 실패로 전파하지 않음
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
  } catch {
    // Silent fallback
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
- Model: 5-Layer (L1:Core / L2:Derived / L3:External[relational,structural,topical] / L4:Action / L5:Context[buffer,boundary])

## Required Rules (MUST)

- When searching vault documents MUST use \`kg_search\` or \`kg_navigate\`. Do not search vault files directly with Grep or Read.
- When reading vault documents MUST use \`read\`. Do not read vault markdown files directly with the Read tool.
- When recording new knowledge to vault MUST use \`create\`. Do not create files directly in the vault with the Write tool.
- When modifying vault documents MUST use \`update\`. Do not edit vault markdown files directly with the Edit tool.
- When learning new information MUST use \`kg_suggest_links\` to check for connection possibilities with existing knowledge.
- When creating documents MUST specify layer and tags.
- When creating documents about interactions with people (meetings, conversations, collaborations), MUST include \`mentioned_persons\` parameter in \`create\` with the names of people mentioned. This is separate from \`person_ref\` (L3A-only, identifies who a profile document is about). \`mentioned_persons\` captures anyone mentioned in any document at any layer.

## Forbidden Rules (FORBIDDEN)

- FORBIDDEN: Directly using Read, Write, Edit, Grep, Glob tools on markdown files within the vault path
- FORBIDDEN: Directly modifying L1_Core documents (must go through the identity-guardian agent)
- FORBIDDEN: Directly modifying the .maencof/ or .maencof-meta/ directories
- FORBIDDEN: Using Claude's built-in memory (<remember> tags / MEMORY.md) to store user knowledge or conversation insights

## Memory Routing (CRITICAL)

- NEVER use Claude's built-in auto-memory (<remember> tags or MEMORY.md) for knowledge the user asks to remember.
- When the user says "기억해줘", "기억해", "remember this", "save this", "기록해", "메모해" or similar memory requests, ALWAYS route to \`/maencof:maencof-remember\` skill or \`create\` tool.
- Claude's auto-memory is ONLY for Claude's own operational notes (tool preferences, workflow settings). All user knowledge MUST go to the maencof vault.

## Tool Mapping

| Action | Use | Do NOT Use |
|---|---|---|
| Search vault documents | kg_search, kg_navigate | Grep, Glob |
| Read vault documents | read | Read |
| Create vault documents | create | Write |
| Update vault documents | update | Edit |
| Delete vault documents | delete | Bash rm |
| Move vault documents | move | Bash mv |
| Check vault status | kg_status | ls, find |
| Assemble context | kg_context | Manual file assembly |
| Capture insight | capture_insight | create (use dedicated tool) |
| Modify CLAUDE.md | claudemd_merge | Edit (MAENCOF section) |

## Skills

| Skill | Purpose |
|---|---|
| /maencof:maencof-remember | Record new knowledge |
| /maencof:maencof-recall | Search past knowledge |
| /maencof:maencof-explore | Explore knowledge graph |
| /maencof:maencof-organize | Organize/review knowledge |
| /maencof:maencof-reflect | Reflect on knowledge |
| /maencof:maencof-insight | Manage auto-insight capture |

## Auto-Insight Capture

When auto-insight capture is enabled, monitor the conversation for user insights worth preserving.
When you detect a meaningful insight during conversation, call \`capture_insight\` to record it.
Do NOT ask for confirmation — capture proactively. The user can review later via \`/maencof:maencof-insight --recent\`.
After capture, display: 💡 Insight recorded to L{layer}: "{title}"
Capture criteria and sensitivity are provided via the session meta-prompt at session start.

## Auto-Document Lifecycle (MUST)

- When learning new factual information during conversation, MUST create a vault document using \`create\` with appropriate layer and tags.
- When discovering that existing vault information is outdated, MUST update the document using \`update\`.
- For temporary task context (meeting notes, debugging sessions, research in progress), MUST create Layer 4 (Action) documents with appropriate \`expires\` dates.
- When conversation reveals connections between existing documents, MUST use \`kg_suggest_links\` and update documents to add \`[[wikilinks]]\`.
- When the system advises running \`kg_build\` (stale index advisory), follow the advice promptly.
- Run \`kg_build\` explicitly only when advised by the system (high stale ratio) or for full PageRank recalculation.

## Concept Document Lifecycle

- After creating a document via \`create\`, check whether concept documents exist for each tag used.
- A concept document is a Layer 3C (topical) document that defines and explains a tag/concept (e.g., \`03_External/topical/distributed-systems.md\` for tag \`distributed-systems\`).
- If a tag has been used 3+ times across documents but has no concept document, suggest creating one:
  "Tag '{tag}' is used in {N} documents but has no concept document. Create one with \`/maencof:maencof-remember --layer 3 --sub-layer topical --title "{tag}" --tags {tag},concept\`?"
- Use \`kg_search\` with the tag as seed to check for existing concept documents before suggesting.
- Do NOT auto-create concept documents — always suggest and wait for user confirmation.

## Status Documents (Layer 4)

- Create \`04_Action/\` status documents for: ongoing research, active decisions, session context
- Set \`expires\` to 7 days for volatile context, 30 days for project status
- The system tracks document freshness automatically via the knowledge graph`;
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
