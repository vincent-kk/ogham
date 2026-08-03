/**
 * @file planMigration.ts
 * @description 마이그레이션 계획을 생성한다 (side-effect 없음).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

import {
  EXPECTED_ARCHITECTURE_VERSION,
  L3_SUBDIR,
} from '../../../constants/architecture.js';
import type { MigrationOp, MigrationPlan } from '../../../types/setup.js';

import { classifyL3Document } from './classifyL3Document.js';
import { readArchitectureVersion } from './readArchitectureVersion.js';

/** v2 의 L5 서브레이어 디렉토리 — v3 에서 평면화·이관 대상이다. */
const LEGACY_L5_BUFFER_DIR = 'buffer';
const LEGACY_L5_BOUNDARY_DIR = 'boundary';

/** v2 의 boundary_type 값 → v3 hub_kind. 알 수 없는 값은 cross_domain 으로 수렴한다. */
const HUB_KIND_BY_BOUNDARY_TYPE: Record<string, string> = {
  project_moc: 'project_moc',
  cross_domain: 'cross_domain',
  synthesis: 'synthesis',
};

/**
 * 마이그레이션 계획을 생성한다 (side-effect 없음).
 *
 * @param vaultPath - vault 루트 절대 경로
 * @returns 현재/목표 버전과 실행할 연산 목록. 실행은 executeMigration 이 맡는다
 */
export function planMigration(vaultPath: string): MigrationPlan {
  const current = readArchitectureVersion(vaultPath);
  const ops: MigrationOp[] = [];

  const l3Dir = join(vaultPath, '03_External');
  const l5Dir = join(vaultPath, '05_Context');

  // 1. L3 서브디렉토리 생성 (L5 는 평면 구조라 만들 서브디렉토리가 없다)
  for (const subdir of Object.values(L3_SUBDIR)) {
    const target = join(l3Dir, subdir);
    if (!existsSync(target)) ops.push({ type: 'create_dir', path: target });
  }

  // 2. L3 문서 분류 및 이동 계획
  if (existsSync(l3Dir))
    for (const filePath of collectMarkdownFiles(l3Dir, 1)) {
      const fm = parseSimpleFrontmatter(filePath);
      if (!fm) continue;

      const sublayer = classifyL3Document(fm, (fm.tags as string[]) ?? []);
      const targetPath = join(l3Dir, L3_SUBDIR[sublayer], basename(filePath));
      if (filePath === targetPath) continue;

      ops.push({ type: 'move_file', from: filePath, to: targetPath });
      ops.push({
        type: 'update_frontmatter',
        path: targetPath,
        field: 'sub_layer',
        oldValue: fm.sub_layer ?? undefined,
        newValue: sublayer,
      });
    }

  // 3. L5 평면화 + 허브 이관
  ops.push(...planL5Flattening(l5Dir));
  ops.push(...planBoundaryHandover(l5Dir, l3Dir));
  for (const legacy of [LEGACY_L5_BUFFER_DIR, LEGACY_L5_BOUNDARY_DIR]) {
    const dir = join(l5Dir, legacy);
    if (existsSync(dir)) ops.push({ type: 'remove_dir', path: dir });
  }

  // 4. 버전 업데이트
  ops.push({
    type: 'update_version',
    path: join(vaultPath, '.maencof-meta', 'version.json'),
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
 * `05_Context/buffer/` 문서를 `05_Context/` 평면으로 올리고 sub_layer 를 제거한다.
 *
 * @param l5Dir - `05_Context` 절대 경로
 * @returns 이동과 frontmatter 정리 연산. buffer 디렉토리가 없으면 빈 배열
 */
function planL5Flattening(l5Dir: string): MigrationOp[] {
  const bufferDir = join(l5Dir, LEGACY_L5_BUFFER_DIR);
  if (!existsSync(bufferDir)) return [];

  const ops: MigrationOp[] = [];
  for (const filePath of collectMarkdownFiles(bufferDir, 2)) {
    const targetPath = join(l5Dir, basename(filePath));
    ops.push({ type: 'move_file', from: filePath, to: targetPath });
    ops.push({
      type: 'update_frontmatter',
      path: targetPath,
      field: 'sub_layer',
      oldValue: 'buffer',
      newValue: undefined,
    });
  }
  return ops;
}

/**
 * `05_Context/boundary/` 문서를 L3-structural 로 옮기고 hub 속성으로 변환한다.
 * 허브는 레이어가 아니라 역할이므로 자리를 옮기고 속성만 남긴다.
 *
 * @param l5Dir - `05_Context` 절대 경로
 * @param l3Dir - `03_External` 절대 경로
 * @returns 이동과 frontmatter 변환 연산. boundary 디렉토리가 없으면 빈 배열
 */
function planBoundaryHandover(l5Dir: string, l3Dir: string): MigrationOp[] {
  const boundaryDir = join(l5Dir, LEGACY_L5_BOUNDARY_DIR);
  if (!existsSync(boundaryDir)) return [];

  const ops: MigrationOp[] = [];
  for (const filePath of collectMarkdownFiles(boundaryDir, 2)) {
    const fm = parseSimpleFrontmatter(filePath) ?? {};
    const targetPath = join(l3Dir, L3_SUBDIR.structural, basename(filePath));
    ops.push({ type: 'move_file', from: filePath, to: targetPath });

    const boundaryType = String(fm.boundary_type ?? '');
    // purpose 는 hub=true 의 필수 짝이다. 없이 이관하면 즉시 검증에 걸린다.
    const purpose = String(fm.purpose ?? fm.title ?? basename(filePath, '.md'));

    for (const [field, newValue] of [
      ['layer', 3],
      ['sub_layer', 'structural'],
      ['hub', true],
      ['hub_kind', HUB_KIND_BY_BOUNDARY_TYPE[boundaryType] ?? 'cross_domain'],
      ['purpose', purpose],
      ['boundary_type', undefined],
      ['connected_layers', undefined],
    ] as const)
      ops.push({
        type: 'update_frontmatter',
        path: targetPath,
        field,
        oldValue: fm[field],
        newValue,
      });
  }
  return ops;
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
      if (stat.isFile() && entry.endsWith('.md')) results.push(fullPath);
      else if (stat.isDirectory()) walk(fullPath, depth + 1);
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
