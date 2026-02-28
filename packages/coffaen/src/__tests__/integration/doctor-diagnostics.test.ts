/**
 * @file doctor-diagnostics.test.ts
 * @description Doctor 6가지 진단 시뮬레이션 통합 테스트
 *
 * 진단 항목:
 * 1. broken-link — 끊어진 링크 감지
 * 2. missing-frontmatter — Frontmatter 없는 파일 감지
 * 3. expired-document — 만료된 문서 감지
 * 4. stale-index — 인덱스 신선도 부족 감지
 * 5. orphan-node — 고립 노드 감지
 * 6. layer-mismatch — Layer/디렉토리 불일치 감지
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../core/document-parser.js';
import { scanVault } from '../../core/vault-scanner.js';
import { handleCoffaenCreate } from '../../mcp/tools/coffaen-create.js';
import { handleKgBuild } from '../../mcp/tools/kg-build.js';
import { handleKgStatus } from '../../mcp/tools/kg-status.js';
import type { DiagnosticItem, DiagnosticResult } from '../../types/doctor.js';

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'coffaen-doctor-'));
}

/** 진단 실행 시뮬레이터 */
async function runDiagnostics(vaultPath: string): Promise<DiagnosticResult> {
  const startTime = Date.now();
  const items: DiagnosticItem[] = [];
  const files = await scanVault(vaultPath);
  const today = new Date().toISOString().slice(0, 10);

  for (const file of files) {
    const { readFile, stat } = await import('node:fs/promises');
    const content = await readFile(file.absolutePath, 'utf-8');
    const stats = await stat(file.absolutePath);
    const doc = parseDocument(file.relativePath, content, stats.mtimeMs);
    const nodeResult = buildKnowledgeNode(doc);

    const fm = doc.frontmatter.success ? doc.frontmatter.data : undefined;

    // 1. missing-frontmatter
    if (!fm?.layer) {
      items.push({
        category: 'missing-frontmatter',
        severity: 'error',
        path: file.relativePath,
        message: `Frontmatter 누락: ${file.relativePath}`,
        autoFix: {
          description: 'coffaen_update로 Frontmatter 추가',
          fixable: true,
        },
      });
    }

    // 2. expired-document
    if (fm?.expires && fm.expires < today) {
      items.push({
        category: 'expired-document',
        severity: 'warning',
        path: file.relativePath,
        message: `만료된 문서: ${file.relativePath} (만료일: ${fm.expires})`,
        autoFix: {
          description: 'coffaen_delete로 만료 문서 삭제',
          fixable: true,
        },
      });
    }

    // 3. broken-link (상대 경로 링크 확인)
    for (const link of doc.links) {
      if (!link.isAbsolute) {
        const linkedAbs = join(vaultPath, link.href);
        try {
          const { access } = await import('node:fs/promises');
          await access(linkedAbs);
        } catch {
          items.push({
            category: 'broken-link',
            severity: 'warning',
            path: file.relativePath,
            message: `끊어진 링크: ${link.href} in ${file.relativePath}`,
            autoFix: { description: '링크 수동 수정 필요', fixable: false },
          });
        }
      }
    }

    // 4. layer-mismatch (디렉토리와 frontmatter layer 불일치)
    if (fm && nodeResult.success && nodeResult.node) {
      const pathParts = file.relativePath.split('/');
      if (pathParts.length >= 2) {
        const dirName = pathParts[0];
        const layerDirMap: Record<number, string> = {
          1: '01_Core',
          2: '02_Derived',
          3: '03_External',
          4: '04_Action',
          5: '05_Context',
        };
        const expectedDir = layerDirMap[nodeResult.node.layer];
        if (expectedDir && dirName !== expectedDir) {
          items.push({
            category: 'layer-mismatch',
            severity: 'warning',
            path: file.relativePath,
            message: `Layer 불일치: 파일은 ${dirName}에 있지만 frontmatter는 Layer ${nodeResult.node.layer}`,
            autoFix: {
              description: 'coffaen_move로 올바른 Layer로 이동',
              fixable: true,
            },
          });
        }
      }
    }
  }

  // 5. orphan-node (링크가 없고 backlink도 없는 노드)
  // 간단한 구현: 파일이 있지만 다른 파일에서 참조되지 않는 경우
  const allPaths = new Set(files.map((f) => f.relativePath));
  const linkedPaths = new Set<string>();
  for (const file of files) {
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(file.absolutePath, 'utf-8');
    const doc = parseDocument(file.relativePath, content, 0);
    for (const link of doc.links) {
      if (!link.isAbsolute) linkedPaths.add(link.href);
    }
  }
  for (const path of allPaths) {
    // Layer 1 문서는 고립 노드 검사 제외
    if (
      !path.startsWith('01_Core/') &&
      !linkedPaths.has(path) &&
      files.length > 1
    ) {
      items.push({
        category: 'orphan-node',
        severity: 'info',
        path,
        message: `고립 노드: ${path} — 다른 문서에서 참조되지 않음`,
        autoFix: {
          description: '연결 문서 생성 또는 삭제 고려',
          fixable: false,
        },
      });
    }
  }

  const errorCount = items.filter((i) => i.severity === 'error').length;
  const warningCount = items.filter((i) => i.severity === 'warning').length;
  const infoCount = items.filter((i) => i.severity === 'info').length;
  const fixableCount = items.filter((i) => i.autoFix?.fixable).length;

  return {
    items,
    errorCount,
    warningCount,
    infoCount,
    fixableCount,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}

describe('Doctor 진단 통합 테스트', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('진단 1: 정상 vault — 오류 없음', async () => {
    await handleCoffaenCreate(vault, {
      layer: 1,
      tags: ['identity'],
      content: '정상 문서입니다.',
      title: 'Normal Doc',
      filename: 'normal',
    });

    const result = await runDiagnostics(vault);
    expect(result.errorCount).toBe(0);
    expect(result.checkedAt).toBeTruthy();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('진단 2: missing-frontmatter — Frontmatter 없는 파일 감지', async () => {
    // Frontmatter 없는 파일 생성
    const dir = join(vault, '02_Derived');
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'no-frontmatter.md'),
      '# 제목만 있는 파일\n\n내용입니다.',
      'utf-8',
    );

    const result = await runDiagnostics(vault);
    const missingFm = result.items.filter(
      (i) => i.category === 'missing-frontmatter',
    );
    expect(missingFm.length).toBeGreaterThan(0);
    expect(missingFm[0].severity).toBe('error');
    expect(missingFm[0].path).toContain('no-frontmatter.md');
  });

  it('진단 3: expired-document — 만료된 문서 감지', async () => {
    await handleCoffaenCreate(vault, {
      layer: 4,
      tags: ['action', 'expired'],
      content: '이미 만료된 액션 아이템',
      title: 'Expired Task',
      filename: 'expired-task',
      expires: '2020-01-01', // 과거 날짜
    });

    const result = await runDiagnostics(vault);
    const expired = result.items.filter(
      (i) => i.category === 'expired-document',
    );
    expect(expired.length).toBeGreaterThan(0);
    expect(expired[0].severity).toBe('warning');
    expect(expired[0].message).toContain('2020-01-01');
  });

  it('진단 4: stale-index — 인덱스 신선도 부족 감지', async () => {
    // 문서 10개 생성 후 stale 추가
    for (let i = 0; i < 10; i++) {
      await handleCoffaenCreate(vault, {
        layer: 2,
        tags: [`tag-${i}`],
        content: `문서 ${i}`,
        title: `Doc ${i}`,
        filename: `doc-${i}`,
      });
    }

    const buildResult = await handleKgBuild(vault, { force: true });
    expect(buildResult.success).toBe(true);

    // stale-nodes 수동 추가 (2개 이상으로 10% 초과)
    const cacheDir = join(vault, '.coffaen');
    const staleNodes = {
      paths: [
        '02_Derived/doc-0.md',
        '02_Derived/doc-1.md',
        '02_Derived/doc-2.md',
      ],
      updatedAt: new Date().toISOString(),
    };
    await writeFile(
      join(cacheDir, 'stale-nodes.json'),
      JSON.stringify(staleNodes),
      'utf-8',
    );

    // graph 로드 후 status 확인
    const { MetadataStore } = await import('../../index/metadata-store.js');
    const store = new MetadataStore(vault);
    const graph = await store.loadGraph();

    const status = await handleKgStatus(vault, graph, {});
    expect(status.staleNodeCount).toBe(3);
    expect(status.freshnessPercent).toBeLessThan(100);
    expect(status.rebuildRecommended).toBe(true);
  });

  it('진단 5: orphan-node — 고립 노드 감지', async () => {
    // 서로 연결되지 않은 두 문서 생성
    await handleCoffaenCreate(vault, {
      layer: 1,
      tags: ['identity'],
      content: '고립된 Core 문서',
      title: 'Isolated Core',
      filename: 'isolated-core',
    });
    await handleCoffaenCreate(vault, {
      layer: 2,
      tags: ['isolated'],
      content: '아무도 참조하지 않는 문서',
      title: 'Orphan Doc',
      filename: 'orphan',
    });

    const result = await runDiagnostics(vault);
    const orphans = result.items.filter((i) => i.category === 'orphan-node');
    // Layer 2 고립 노드는 감지됨
    expect(orphans.length).toBeGreaterThan(0);
    expect(orphans[0].severity).toBe('info');
  });

  it('진단 6: layer-mismatch — Layer/디렉토리 불일치 감지', async () => {
    // Layer 1 문서를 02_Derived 디렉토리에 잘못 배치
    const dir = join(vault, '02_Derived');
    await mkdir(dir, { recursive: true });
    const content = `---
created: 2024-01-01
updated: 2024-01-01
tags: [identity]
layer: 1
---

# Layer 1 문서가 02_Derived에 있음`;
    await writeFile(join(dir, 'misplaced.md'), content, 'utf-8');

    const result = await runDiagnostics(vault);
    const mismatches = result.items.filter(
      (i) => i.category === 'layer-mismatch',
    );
    expect(mismatches.length).toBeGreaterThan(0);
    expect(mismatches[0].message).toContain('Layer 불일치');
    expect(mismatches[0].autoFix?.fixable).toBe(true);
  });

  it('DiagnosticResult 집계 — errorCount/warningCount/infoCount 올바름', async () => {
    // 여러 종류의 문제가 있는 vault 구성
    const dir2 = join(vault, '02_Derived');
    await mkdir(dir2, { recursive: true });
    await writeFile(join(dir2, 'no-fm.md'), '# no frontmatter', 'utf-8');

    await handleCoffaenCreate(vault, {
      layer: 4,
      tags: ['expired'],
      content: '만료됨',
      title: 'Expired',
      filename: 'expired',
      expires: '2019-12-31',
    });

    const result = await runDiagnostics(vault);
    expect(result.errorCount + result.warningCount + result.infoCount).toBe(
      result.items.length,
    );
    expect(result.fixableCount).toBeGreaterThanOrEqual(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
