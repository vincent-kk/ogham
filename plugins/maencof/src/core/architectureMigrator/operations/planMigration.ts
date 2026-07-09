/**
 * @file planMigration.ts
 * @description 마이그레이션 계획을 생성한다 (side-effect 없음).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

import {
  EXPECTED_ARCHITECTURE_VERSION,
  L3_SUBDIR,
  L5_SUBDIR,
} from '../../../constants/architecture.js';
import type { MigrationOp, MigrationPlan } from '../../../types/setup.js';

import { classifyL3Document } from './classifyL3Document.js';
import { readArchitectureVersion } from './readArchitectureVersion.js';

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
    if (!existsSync(target)) ops.push({ type: 'create_dir', path: target });
  }

  // 2. L5 서브디렉토리 생성
  for (const subdir of Object.values(L5_SUBDIR)) {
    const target = join(l5Dir, subdir);
    if (!existsSync(target)) ops.push({ type: 'create_dir', path: target });
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
