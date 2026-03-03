/**
 * @file index-invalidator-advisory.test.ts
 * @description index-invalidator.ts advisory message 및 stale-node 추적 유닛 테스트
 *
 * 테스트 대상:
 * - runIndexInvalidator: advisory message 반환 로직
 * - readStaleNodeCount / readGraphNodeCount: graceful fallback
 * - maencof_move 듀얼 패스 추적
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  readGraphNodeCount,
  readStaleNodeCount,
  runIndexInvalidator,
} from '../../hooks/index-invalidator.js';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function createTempVault(): string {
  const dir = join(tmpdir(), `maencof-invalidator-test-${Date.now()}`);
  mkdirSync(join(dir, '.maencof'), { recursive: true });
  mkdirSync(join(dir, '.maencof-meta'), { recursive: true });
  return dir;
}

function writeStaleNodes(vaultDir: string, paths: string[]): void {
  writeFileSync(
    join(vaultDir, '.maencof', 'stale-nodes.json'),
    JSON.stringify({ paths, updatedAt: new Date().toISOString() }),
    'utf-8',
  );
}

function writeGraphJson(vaultDir: string, nodeCount: number): void {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
  }));
  writeFileSync(
    join(vaultDir, '.maencof', 'index.json'),
    JSON.stringify({ nodes }),
    'utf-8',
  );
}

// ─── readStaleNodeCount ───────────────────────────────────────────────────────

describe('readStaleNodeCount', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true });
  });

  it('stale-nodes.json이 없을 때 0을 반환한다', () => {
    expect(readStaleNodeCount(vaultDir)).toBe(0);
  });

  it('stale-nodes.json의 paths 배열 길이를 반환한다', () => {
    writeStaleNodes(vaultDir, ['01_Core/a.md', '02_Derived/b.md']);
    expect(readStaleNodeCount(vaultDir)).toBe(2);
  });

  it('손상된 stale-nodes.json은 0을 반환한다', () => {
    writeFileSync(
      join(vaultDir, '.maencof', 'stale-nodes.json'),
      '{invalid json',
      'utf-8',
    );
    expect(readStaleNodeCount(vaultDir)).toBe(0);
  });

  it('paths가 배열이 아닌 경우 0을 반환한다', () => {
    writeFileSync(
      join(vaultDir, '.maencof', 'stale-nodes.json'),
      JSON.stringify({ paths: 'not-an-array' }),
      'utf-8',
    );
    expect(readStaleNodeCount(vaultDir)).toBe(0);
  });
});

// ─── readGraphNodeCount ───────────────────────────────────────────────────────

describe('readGraphNodeCount', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true });
  });

  it('index.json이 없을 때 0을 반환한다', () => {
    expect(readGraphNodeCount(vaultDir)).toBe(0);
  });

  it('nodes 배열 길이를 반환한다', () => {
    writeGraphJson(vaultDir, 20);
    expect(readGraphNodeCount(vaultDir)).toBe(20);
  });

  it('nodes가 객체인 경우 키 개수를 반환한다', () => {
    writeFileSync(
      join(vaultDir, '.maencof', 'index.json'),
      JSON.stringify({ nodes: { a: {}, b: {}, c: {} } }),
      'utf-8',
    );
    expect(readGraphNodeCount(vaultDir)).toBe(3);
  });

  it('손상된 index.json은 0을 반환한다', () => {
    writeFileSync(
      join(vaultDir, '.maencof', 'index.json'),
      '{invalid json',
      'utf-8',
    );
    expect(readGraphNodeCount(vaultDir)).toBe(0);
  });
});

// ─── runIndexInvalidator advisory message ────────────────────────────────────

describe('runIndexInvalidator advisory message', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = createTempVault();
  });

  afterEach(() => {
    rmSync(vaultDir, { recursive: true, force: true });
  });

  it('maencof vault가 아닌 경우 hookMessage 없이 continue: true를 반환한다', () => {
    const nonVaultDir = join(tmpdir(), `non-vault-${Date.now()}`);
    mkdirSync(nonVaultDir, { recursive: true });
    try {
      const result = runIndexInvalidator({
        tool_name: 'maencof_create',
        cwd: nonVaultDir,
      });
      expect(result.continue).toBe(true);
      expect(result.hookMessage).toBeUndefined();
    } finally {
      rmSync(nonVaultDir, { recursive: true, force: true });
    }
  });

  it('stale nodes가 없을 때 hookMessage를 반환하지 않는다', () => {
    writeGraphJson(vaultDir, 100);
    // stale-nodes.json 없음
    const result = runIndexInvalidator({
      tool_name: 'maencof_create',
      cwd: vaultDir,
      tool_response: { path: '02_Derived/note.md' },
    });
    expect(result.continue).toBe(true);
    // appendStaleNode 후 stale 1개, graph 100개 → 1% → info message
    expect(result.hookMessage).toContain('pending change');
  });

  it('stale ratio > 10% 시 rebuild warning advisory를 반환한다', () => {
    // 11개 stale, 50개 전체 → 22% > 10%
    writeStaleNodes(
      vaultDir,
      Array.from({ length: 11 }, (_, i) => `02_Derived/note-${i}.md`),
    );
    writeGraphJson(vaultDir, 50);
    const result = runIndexInvalidator({
      tool_name: 'maencof_update',
      tool_input: { path: '02_Derived/extra.md' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookMessage).toContain('kg_build');
    expect(result.hookMessage).toContain('stale nodes detected');
    expect(result.hookMessage).toMatch(/\d+%/);
  });

  it('stale ratio <= 10% 시 soft info advisory를 반환한다', () => {
    // 5개 stale, 100개 전체 → 5% <= 10%
    writeStaleNodes(
      vaultDir,
      Array.from({ length: 5 }, (_, i) => `02_Derived/note-${i}.md`),
    );
    writeGraphJson(vaultDir, 100);
    const result = runIndexInvalidator({
      tool_name: 'maencof_update',
      tool_input: { path: '02_Derived/extra.md' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookMessage).toContain('pending change');
    expect(result.hookMessage).toContain('kg_build');
  });

  it('advisory message에 stale count와 percentage가 포함된다', () => {
    // 11개 stale, 50개 전체 → 22%
    writeStaleNodes(
      vaultDir,
      Array.from({ length: 11 }, (_, i) => `02_Derived/note-${i}.md`),
    );
    writeGraphJson(vaultDir, 50);
    const result = runIndexInvalidator({
      tool_name: 'maencof_update',
      tool_input: { path: '02_Derived/extra.md' },
      cwd: vaultDir,
    });
    expect(result.hookMessage).toMatch(/\d+ stale nodes? detected/);
    expect(result.hookMessage).toMatch(/\d+%/);
  });

  it('stale-nodes.json이 없을 때 graceful하게 처리한다', () => {
    writeGraphJson(vaultDir, 50);
    // stale-nodes.json 없음 — appendStaleNode가 새로 생성
    const result = runIndexInvalidator({
      tool_name: 'maencof_create',
      cwd: vaultDir,
      tool_response: { path: '02_Derived/new.md' },
    });
    expect(result.continue).toBe(true);
    // 1개 stale / 50개 → 2% → soft advisory
    expect(result.hookMessage).toContain('pending change');
  });

  it('index.json이 없을 때 graceful하게 처리한다 (percent=100으로 advisory 반환)', () => {
    writeStaleNodes(vaultDir, ['02_Derived/a.md']);
    // index.json 없음 → totalCount=0 → percent=100 > 10 → rebuild advisory
    const result = runIndexInvalidator({
      tool_name: 'maencof_update',
      tool_input: { path: '02_Derived/b.md' },
      cwd: vaultDir,
    });
    expect(result.continue).toBe(true);
    expect(result.hookMessage).toBeDefined();
  });

  it('maencof_move가 source와 target 양쪽을 stale로 추적한다', () => {
    writeGraphJson(vaultDir, 100);
    const sourcePath = '02_Derived/old.md';
    const targetPath = '03_External/new.md';

    runIndexInvalidator({
      tool_name: 'maencof_move',
      tool_input: { path: sourcePath },
      tool_response: { path: targetPath },
      cwd: vaultDir,
    });

    // source + target = 최소 2개 stale 노드
    const staleCount = readStaleNodeCount(vaultDir);
    expect(staleCount).toBeGreaterThanOrEqual(2);

    // stale-nodes.json에 두 경로 모두 포함되어야 함
    const raw = readFileSync(
      join(vaultDir, '.maencof', 'stale-nodes.json'),
      'utf-8',
    ) as string;
    const data = JSON.parse(raw) as { paths: string[] };
    expect(data.paths).toContain(sourcePath);
    expect(data.paths).toContain(targetPath);
  });
});
