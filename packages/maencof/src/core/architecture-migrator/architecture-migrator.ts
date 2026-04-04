/**
 * @file architecture-migrator.ts
 * @description v1 → v2 아키텍처 마이그레이션 — L3 서브레이어 + L5 Buffer/Boundary
 *
 * WAL(Write-Ahead Log) 기반으로 모든 작업이 원자적으로 실행되며,
 * 실패 시 rollback이 보장된다.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';

import {
  EXPECTED_ARCHITECTURE_VERSION,
  type L3SubLayer,
  L3_SUBDIR,
  L5_SUBDIR,
} from '../../types/common.js';
import type {
  MigrationOp,
  MigrationPlan,
  MigrationResult,
  MigrationWAL,
} from '../../types/setup.js';
import type { VaultVersionInfo } from '../../types/setup.js';

// ─── Tag Heuristics ────────────────────────────────────────────

const PERSON_TAGS = new Set([
  'person',
  'people',
  'friend',
  'colleague',
  'mentor',
]);
const ORG_TAGS = new Set(['company', 'organization', 'team', 'community']);

// ─── Public API ────────────────────────────────────────────────

/**
 * 현재 vault의 아키텍처 버전을 확인한다.
 */
export function checkArchitectureVersion(vaultPath: string): {
  current: string;
  expected: string;
  needsMigration: boolean;
} {
  const current = readArchitectureVersion(vaultPath);
  return {
    current,
    expected: EXPECTED_ARCHITECTURE_VERSION,
    needsMigration: current !== EXPECTED_ARCHITECTURE_VERSION,
  };
}

/**
 * L3 문서를 서브레이어로 분류한다.
 *
 * 분류 우선순위:
 * 1. person / person_ref 필드 → relational
 * 2. org_type 필드 → structural
 * 3. 태그 휴리스틱 (PERSON_TAGS → relational, ORG_TAGS → structural)
 * 4. 기본값 → topical
 */
export function classifyL3Document(
  fm: Record<string, unknown>,
  tags: string[],
): L3SubLayer {
  // Rule 1: person object or person_ref present
  if (fm.person || fm.person_ref) return 'relational';

  // Rule 2: org_type present
  if (fm.org_type) return 'structural';

  // Rule 3: tag heuristics
  const lowerTags = tags.map((t) => t.toLowerCase());
  if (lowerTags.some((t) => PERSON_TAGS.has(t))) return 'relational';
  if (lowerTags.some((t) => ORG_TAGS.has(t))) return 'structural';

  // Default
  return 'topical';
}

/**
 * 마이그레이션 계획을 생성한다 (side-effect 없음).
 */
export function planMigration(vaultPath: string): MigrationPlan {
  const current = readArchitectureVersion(vaultPath);
  const ops: MigrationOp[] = [];

  const l3Dir = join(vaultPath, '03_External');
  const l5Dir = join(vaultPath, '05_Context');

  // 1. L3 서브디렉토리 생성
  for (const subdir of Object.values(L3_SUBDIR)) {
    const target = join(l3Dir, subdir);
    if (!existsSync(target)) {
      ops.push({ type: 'create_dir', path: target });
    }
  }

  // 2. L5 서브디렉토리 생성
  for (const subdir of Object.values(L5_SUBDIR)) {
    const target = join(l5Dir, subdir);
    if (!existsSync(target)) {
      ops.push({ type: 'create_dir', path: target });
    }
  }

  // 3. L3 문서 분류 및 이동 계획
  if (existsSync(l3Dir)) {
    const l3Files = collectMarkdownFiles(l3Dir, 1);
    for (const filePath of l3Files) {
      const fm = parseSimpleFrontmatter(filePath);
      if (!fm) continue;

      const tags = (fm.tags as string[]) ?? [];
      const sublayer = classifyL3Document(fm, tags);
      const targetDir = join(l3Dir, L3_SUBDIR[sublayer]);
      const targetPath = join(targetDir, basename(filePath));

      if (filePath !== targetPath) {
        ops.push({ type: 'move_file', from: filePath, to: targetPath });
        ops.push({
          type: 'update_frontmatter',
          path: targetPath,
          field: 'sub_layer',
          oldValue: fm.sub_layer ?? undefined,
          newValue: sublayer,
        });
      }
    }
  }

  // 4. 버전 업데이트
  const versionPath = join(vaultPath, '.maencof-meta', 'version.json');
  ops.push({
    type: 'update_version',
    path: versionPath,
    oldVersion: current,
    newVersion: EXPECTED_ARCHITECTURE_VERSION,
  });

  return {
    currentVersion: current,
    targetVersion: EXPECTED_ARCHITECTURE_VERSION,
    operations: ops,
    summary: {
      dirsToCreate: ops.filter((o) => o.type === 'create_dir').length,
      filesToMove: ops.filter((o) => o.type === 'move_file').length,
      frontmatterUpdates: ops.filter((o) => o.type === 'update_frontmatter')
        .length,
    },
  };
}

/**
 * WAL 기반으로 마이그레이션을 실행한다.
 */
export function executeMigration(
  vaultPath: string,
  plan: MigrationPlan,
): MigrationResult {
  const walPath = join(vaultPath, '.maencof-meta', 'migration-wal.json');
  const wal: MigrationWAL = {
    id: `mig-${Date.now()}`,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    operations: plan.operations.map((op) => ({
      op,
      status: 'pending' as const,
    })),
  };

  // WAL 기록
  writeWAL(walPath, wal);

  let executedCount = 0;
  let failedCount = 0;

  for (const entry of wal.operations) {
    try {
      executeOp(entry.op, vaultPath);
      entry.status = 'done';
      entry.executedAt = new Date().toISOString();
      executedCount++;
      writeWAL(walPath, wal);
    } catch (err) {
      failedCount++;
      wal.status = 'in_progress'; // remains in_progress for rollback
      writeWAL(walPath, wal);
      return {
        success: false,
        walId: wal.id,
        operationsExecuted: executedCount,
        operationsFailed: failedCount,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  wal.status = 'completed';
  wal.completedAt = new Date().toISOString();
  writeWAL(walPath, wal);

  return {
    success: true,
    walId: wal.id,
    operationsExecuted: executedCount,
    operationsFailed: 0,
  };
}

/**
 * WAL을 읽어 완료된 작업을 역순으로 롤백한다.
 */
export function rollbackMigration(vaultPath: string): {
  success: boolean;
  rolledBack: number;
  error?: string;
} {
  const walPath = join(vaultPath, '.maencof-meta', 'migration-wal.json');
  if (!existsSync(walPath)) {
    return { success: false, rolledBack: 0, error: 'No WAL file found' };
  }

  const wal: MigrationWAL = JSON.parse(
    readFileSync(walPath, 'utf-8'),
  ) as MigrationWAL;

  // 완료된 작업만 역순으로 롤백
  const doneEntries = wal.operations
    .filter((e) => e.status === 'done')
    .reverse();

  let rolledBack = 0;
  for (const entry of doneEntries) {
    try {
      rollbackOp(entry.op, vaultPath);
      entry.status = 'rolled_back';
      rolledBack++;
    } catch (err) {
      wal.status = 'rolled_back';
      writeWAL(walPath, wal);
      return {
        success: false,
        rolledBack,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  wal.status = 'rolled_back';
  wal.completedAt = new Date().toISOString();
  writeWAL(walPath, wal);

  return { success: true, rolledBack };
}

// ─── Internal Helpers ──────────────────────────────────────────

function readArchitectureVersion(vaultPath: string): string {
  const versionPath = join(vaultPath, '.maencof-meta', 'version.json');
  if (!existsSync(versionPath)) return '1.0.0';
  try {
    const data = JSON.parse(
      readFileSync(versionPath, 'utf-8'),
    ) as VaultVersionInfo;
    return data.architecture_version ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}

/**
 * 지정 디렉토리의 마크다운 파일을 수집한다 (maxDepth로 깊이 제한).
 * 서브레이어 디렉토리 내부 파일은 이미 분류된 것이므로 제외한다.
 */
function collectMarkdownFiles(dir: string, maxDepth: number): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  const l3SubDirs = new Set(Object.values(L3_SUBDIR));

  function walk(currentDir: string, depth: number): void {
    if (depth > maxDepth) return;
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      // 이미 서브레이어 디렉토리면 스킵
      if (depth === 0 && l3SubDirs.has(entry)) continue;

      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      if (stat.isFile() && entry.endsWith('.md')) {
        results.push(fullPath);
      } else if (stat.isDirectory()) {
        walk(fullPath, depth + 1);
      }
    }
  }

  walk(dir, 0);
  return results;
}

/**
 * 간단한 YAML frontmatter 파서 (Zod 없이, 마이그레이션 전용).
 */
function parseSimpleFrontmatter(
  filePath: string,
): Record<string, unknown> | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    const yaml = match[1];
    const result: Record<string, unknown> = {};

    for (const line of yaml.split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const rawValue = line.slice(colonIdx + 1).trim();

      if (!key || key.startsWith('-') || key.startsWith(' ')) continue;

      // array value: [a, b, c]
      if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
        result[key] = rawValue
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
        continue;
      }

      // nested object detection (e.g. person:)
      if (rawValue === '' || rawValue === '{}') {
        result[key] = {};
        continue;
      }

      // number
      if (/^\d+$/.test(rawValue)) {
        result[key] = Number(rawValue);
        continue;
      }

      // string (strip quotes)
      result[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }

    return result;
  } catch {
    return null;
  }
}

function executeOp(op: MigrationOp, _vaultPath: string): void {
  switch (op.type) {
    case 'create_dir':
      mkdirSync(op.path, { recursive: true });
      break;
    case 'move_file':
      mkdirSync(dirname(op.to), { recursive: true });
      renameSync(op.from, op.to);
      break;
    case 'update_frontmatter':
      updateFrontmatterField(op.path, op.field, op.newValue);
      break;
    case 'update_version':
      updateVersionFile(op.path, op.newVersion);
      break;
  }
}

function rollbackOp(op: MigrationOp, _vaultPath: string): void {
  switch (op.type) {
    case 'create_dir':
      // 디렉토리가 비어있으면 삭제 (rmdirSync는 비어있을 때만 성공)
      try {
        rmdirSync(op.path);
      } catch {
        // 비어있지 않으면 무시
      }
      break;
    case 'move_file':
      if (existsSync(op.to)) {
        mkdirSync(dirname(op.from), { recursive: true });
        renameSync(op.to, op.from);
      }
      break;
    case 'update_frontmatter':
      if (existsSync(op.path)) {
        updateFrontmatterField(op.path, op.field, op.oldValue);
      }
      break;
    case 'update_version':
      if (existsSync(op.path)) {
        updateVersionFile(op.path, op.oldVersion);
      }
      break;
  }
}

function updateFrontmatterField(
  filePath: string,
  field: string,
  value: unknown,
): void {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (!match) return;

  const yaml = match[2];
  const lines = yaml.split('\n');
  const fieldLine = lines.findIndex((l) => l.startsWith(`${field}:`));

  const valueStr = value === undefined || value === null ? '' : String(value);

  if (fieldLine >= 0) {
    if (valueStr === '') {
      lines.splice(fieldLine, 1);
    } else {
      lines[fieldLine] = `${field}: ${valueStr}`;
    }
  } else if (valueStr !== '') {
    lines.push(`${field}: ${valueStr}`);
  }

  const newContent = `${match[1]}${lines.join('\n')}${match[3]}${content.slice(match[0].length)}`;
  writeFileSync(filePath, newContent, 'utf-8');
}

function updateVersionFile(filePath: string, newVersion: string): void {
  let data: VaultVersionInfo;
  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8')) as VaultVersionInfo;
  } catch {
    data = {
      version: '0.0.0',
      installedAt: new Date().toISOString(),
      migrationHistory: [],
    };
  }
  data.architecture_version = newVersion;
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function writeWAL(walPath: string, wal: MigrationWAL): void {
  mkdirSync(dirname(walPath), { recursive: true });
  writeFileSync(walPath, JSON.stringify(wal, null, 2), 'utf-8');
}
