/**
 * @file publicationMigrate.test.ts
 * @description 간행물 → 99_Archive/clusterseed 마이그레이션 스크립트 블랙박스 검증 —
 * tmp 픽스처 볼트에 skills/migrate/scripts/publication-migrate.mjs 를 spawn 하고
 * dry-run 무변경·이동/스탬프/앵커/스텁 삭제·anomaly 격리·링크 재작성·롤백 바이트
 * 복원·안전 방어선(exit 2/3)을 파일시스템 결과로 판정한다.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// 저장소 관례(hookBundles·skillPortfolio 테스트와 동형): fileURLToPath(import.meta.url)
const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../skills/migrate/scripts/publication-migrate.mjs',
);

const WAL_REL = '.maencof-meta/publication-migration-wal.json';

interface RunResult {
  status: number;
  stdout: string;
}

function runScript(args: string[]): RunResult {
  try {
    return {
      status: 0,
      stdout: execFileSync(process.execPath, [SCRIPT, ...args], {
        encoding: 'utf-8',
      }),
    };
  } catch (e) {
    const err = e as { status?: number | null; stdout?: string };
    return { status: err.status ?? 1, stdout: err.stdout ?? '' };
  }
}

/** stdout 마지막 비공백 라인의 JSON 페이로드 */
function lastJson(stdout: string): Record<string, unknown> {
  const lines = stdout.trim().split('\n');
  return JSON.parse(lines[lines.length - 1]!) as Record<string, unknown>;
}

/**
 * 볼트 파일 스냅샷 — posix 상대경로 → { content, mode } (파일만; mtime 은 비교 제외).
 * 키는 `sep` 기반으로 posix 정규화한다 — Windows 에서 native `relative()` 가 만드는
 * `\` 키는 `WAL_REL` 같은 `/` 리터럴 조회를 빗나가게 한다 (CI run 32348195726).
 */
function snapshotVault(
  root: string,
): Map<string, { content: string; mode: number }> {
  const map = new Map<string, { content: string; mode: number }>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else
        map.set(relative(root, abs).split(sep).join('/'), {
          content: readFileSync(abs, 'utf-8'),
          mode: statSync(abs).mode & 0o777,
        });
    }
  };
  walk(root);
  return map;
}

function writeVaultFile(root: string, rel: string, content: string): void {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf-8');
}

const FIXTURES: Record<string, string> = {
  '04_Action/feed/it-001.md': `---
created: 2026-01-01
updated: 2026-01-02
tags: [feed, alpha]
layer: 4
title: It 001
---

body 001
`,
  '04_Action/feed/it-002.md': `---
created: 2026-01-01
updated: 2026-01-03
tags: [feed]
layer: 4
archived: true
archive_path: ".maencof-meta/archive/04_Action/feed/it-002.md"
title: It 002
---
`,
  '.maencof-meta/archive/04_Action/feed/it-002.md': `---
created: 2026-01-01
updated: 2026-01-03
tags: [feed]
layer: 4
title: It 002
---

body 002
`,
  '.maencof-meta/archive/04_Action/feed/self.md': `---
created: 2026-01-01
updated: 2026-01-04
tags: [feed]
layer: 4
archived: true
archive_path: ".maencof-meta/archive/04_Action/feed/self.md"
title: Self
---
`,
  '03_External/topical/feed-digest-2026-q1.md': `---
created: 2026-02-01
updated: 2026-02-02
tags: [feed, digest]
layer: 3
sub_layer: topical
title: Feed Digest 2026 Q1
---

digest body
`,
  '.maencof-meta/archive/04_Action/feed/old/it-003.md': `---
created: 2025-12-01
updated: 2025-12-02
tags: [feed]
layer: 4
title: It 003
---

body 003
`,
  '.maencof-meta/archive/04_Action/feed/README.md': `---
created: 2025-12-01
updated: 2025-12-01
tags: [feed]
layer: 4
title: Feed Readme
---

series description, must stay in place
`,
  '03_External/topical/feed-digest-2025-q4.md': `---
created: 2025-10-01
updated: 2025-10-02
tags: [feed, digest]
layer: 3
expires: 2026-01-01
title: Feed Digest 2025 Q4
---

variant key order (expires before title)
`,
  '02_Derived/note.md': `---
created: 2026-03-01
updated: 2026-03-01
tags: [note]
layer: 2
title: Note
---

See [[04_Action/feed/it-001.md]] and [[it-001]].
`,
  '02_Derived/note2.md': `---
created: 2026-03-01
updated: 2026-03-01
tags: [note]
layer: 2
title: Note 2
---

Old link [[04_Action/feed/it-001.md]] and future path 99_Archive/feed/it-001.md mentioned.
`,
};

const CONFIG = {
  version: 1,
  archiveRoot: '99_Archive',
  series: [
    {
      key: 'feed-thread',
      title: 'Feed Thread',
      anchor: {
        path: '03_External/clusterseeds/feed-thread.md',
        tags: ['feed', 'feed-thread'],
        gist: 'Feed series anchor',
        description: 'Publication series for feed items.',
      },
      archiveDir: 'feed',
      moveSources: [
        { dir: '04_Action/feed', filePattern: '^it-' },
        { dir: '.maencof-meta/archive/04_Action/feed', recursive: true },
      ],
      stampOnly: [{ dir: '03_External/topical', filePattern: '^feed-digest-' }],
      excludePatterns: ['^README'],
      sourceRefs: ['knowledge/feed-adapter.md'],
      deleteStubs: true,
      rewriteLinks: true,
    },
  ],
};

describe('publication-migrate.mjs — black-box on a fixture vault', () => {
  let vault: string;
  let configPath: string;

  beforeEach(() => {
    vault = mkdtempSync(join(tmpdir(), 'maencof-pubmig-'));
    for (const [rel, content] of Object.entries(FIXTURES))
      writeVaultFile(vault, rel, content);
    configPath = join(
      vault,
      '.maencof-meta/tmp/publication-migrate-config.json',
    );
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify(CONFIG, null, 2), 'utf-8');
  });

  afterEach(() => {
    rmSync(vault, { recursive: true, force: true });
  });

  it('dry-run prints a plan and writes nothing', () => {
    const before = snapshotVault(vault);

    const r = runScript([vault, '--config', configPath]);

    expect(r.status).toBe(0);
    const out = lastJson(r.stdout);
    expect(out.mode).toBe('dry-run');
    expect((out.summary as { totalOps: number }).totalOps).toBeGreaterThan(0);
    expect(existsSync(join(vault, WAL_REL))).toBe(false);
    expect(snapshotVault(vault)).toEqual(before);
  });

  it('execute moves bodies into 99_Archive and stamps cluster_key', () => {
    const r = runScript([vault, '--config', configPath, '--execute']);

    expect(r.status).toBe(0);
    for (const rel of [
      '99_Archive/feed/it-001.md',
      '99_Archive/feed/it-002.md',
    ]) {
      expect(existsSync(join(vault, rel)), rel).toBe(true);
      expect(readFileSync(join(vault, rel), 'utf-8')).toContain(
        '\ncluster_key: feed-thread\n',
      );
    }
    expect(existsSync(join(vault, '04_Action/feed/it-001.md'))).toBe(false);
    expect(
      existsSync(join(vault, '.maencof-meta/archive/04_Action/feed/it-002.md')),
    ).toBe(false);
  });

  it('execute creates a schema-valid clusterseed anchor', () => {
    runScript([vault, '--config', configPath, '--execute']);

    const anchor = readFileSync(
      join(vault, '03_External/clusterseeds/feed-thread.md'),
      'utf-8',
    );
    expect(anchor).toContain('\nlayer: 3\n');
    expect(anchor).toContain('\nsub_layer: clusterseed\n');
    expect(anchor).toContain('\ncluster_key: feed-thread\n');
    expect(anchor).toContain('\ntags: [feed, feed-thread]\n');
  });

  it('execute deletes stubs with a WAL content snapshot', () => {
    runScript([vault, '--config', configPath, '--execute']);

    expect(existsSync(join(vault, '04_Action/feed/it-002.md'))).toBe(false);
    const wal = JSON.parse(readFileSync(join(vault, WAL_REL), 'utf-8')) as {
      status: string;
      operations: Array<{
        op: { type: string; path?: string; content?: string };
      }>;
    };
    expect(wal.status).toBe('completed');
    const del = wal.operations.find(
      (e) =>
        e.op.type === 'delete_file' && e.op.path === '04_Action/feed/it-002.md',
    );
    expect(del).toBeDefined();
    expect(del!.op.content).toContain('archived: true');
  });

  it('stampOnly documents are stamped in place, not moved', () => {
    runScript([vault, '--config', configPath, '--execute']);

    const rel = '03_External/topical/feed-digest-2026-q1.md';
    expect(existsSync(join(vault, rel))).toBe(true);
    expect(readFileSync(join(vault, rel), 'utf-8')).toContain(
      '\ncluster_key: feed-thread\n',
    );
    expect(
      existsSync(join(vault, '99_Archive/feed/feed-digest-2026-q1.md')),
    ).toBe(false);
  });

  it('self-referential stub is reported as an anomaly and left untouched', () => {
    const rel = '.maencof-meta/archive/04_Action/feed/self.md';
    const before = readFileSync(join(vault, rel), 'utf-8');

    const r = runScript([vault, '--config', configPath, '--execute']);

    expect(readFileSync(join(vault, rel), 'utf-8')).toBe(before);
    const out = lastJson(r.stdout);
    expect(JSON.stringify(out.anomalies)).toContain(rel);
  });

  it('path links are rewritten, basename links only counted', () => {
    const r = runScript([vault, '--config', configPath, '--execute']);

    const note = readFileSync(join(vault, '02_Derived/note.md'), 'utf-8');
    expect(note).toContain('[[99_Archive/feed/it-001.md]]');
    expect(note).toContain('[[it-001]]');
    const out = lastJson(r.stdout);
    expect(out.basenameLinksSkipped as number).toBeGreaterThanOrEqual(1);
  });

  it('rollback restores the tree byte-identically', () => {
    const before = snapshotVault(vault);

    expect(runScript([vault, '--config', configPath, '--execute']).status).toBe(
      0,
    );
    expect(runScript([vault, '--rollback']).status).toBe(0);

    // WAL 은 롤백 기록 자체이므로 비교에서 제외한다
    const after = snapshotVault(vault);
    const walContent = after.get(WAL_REL);
    after.delete(WAL_REL);
    expect(after).toEqual(before);
    expect(walContent).toBeDefined();
    expect((JSON.parse(walContent!.content) as { status: string }).status).toBe(
      'rolled_back',
    );
    // 생성했던 디렉토리 사다리도 빈 상태면 걷어낸다 (부모 포함 best-effort)
    expect(existsSync(join(vault, '99_Archive'))).toBe(false);
  });

  it('pre-existing target aborts execute with exit 3', () => {
    writeVaultFile(vault, '99_Archive/feed/it-001.md', 'occupied\n');

    const r = runScript([vault, '--config', configPath, '--execute']);

    expect(r.status).toBe(3);
    expect(existsSync(join(vault, '04_Action/feed/it-001.md'))).toBe(true);
  });

  it('existing WAL blocks a second execute with exit 2', () => {
    expect(runScript([vault, '--config', configPath, '--execute']).status).toBe(
      0,
    );
    const before = snapshotVault(vault);

    const r = runScript([vault, '--config', configPath, '--execute']);

    expect(r.status).toBe(2);
    expect(snapshotVault(vault)).toEqual(before);
  });

  it('invalid config is rejected with exit 2', () => {
    const bad = structuredClone(CONFIG);
    bad.series[0]!.anchor.path = '04_Action/x.md';
    writeFileSync(configPath, JSON.stringify(bad), 'utf-8');
    const before = snapshotVault(vault);

    const r = runScript([vault, '--config', configPath, '--execute']);

    expect(r.status).toBe(2);
    expect(snapshotVault(vault)).toEqual(before);
  });

  it('a file already containing the target string is excluded from link rewrite', () => {
    const before = readFileSync(join(vault, '02_Derived/note2.md'), 'utf-8');

    const r = runScript([vault, '--config', configPath, '--execute']);

    expect(readFileSync(join(vault, '02_Derived/note2.md'), 'utf-8')).toBe(
      before,
    );
    const out = lastJson(r.stdout);
    expect(out.preexistingTargetSkipped as number).toBeGreaterThanOrEqual(1);
  });

  it('report carries a machine-readable redirection section', () => {
    const reportPath = join(vault, '.maencof-meta/tmp/report.json');

    const r = runScript([
      vault,
      '--config',
      configPath,
      '--report',
      reportPath,
    ]);

    expect(r.status).toBe(0);
    const report = JSON.parse(readFileSync(reportPath, 'utf-8')) as {
      redirection: Array<{
        key: string;
        ingestionTarget: string;
        anchorPath: string;
        sourceRefs: string[];
      }>;
    };
    expect(report.redirection).toEqual([
      {
        key: 'feed-thread',
        ingestionTarget: '99_Archive/feed/',
        anchorPath: '03_External/clusterseeds/feed-thread.md',
        sourceRefs: ['knowledge/feed-adapter.md'],
      },
    ]);
    const out = lastJson(r.stdout);
    expect(JSON.stringify(out.redirection)).toContain(
      'knowledge/feed-adapter.md',
    );
  });

  it('stamping is key-order independent (expires-before-title variant)', () => {
    runScript([vault, '--config', configPath, '--execute']);

    const variant = readFileSync(
      join(vault, '03_External/topical/feed-digest-2025-q4.md'),
      'utf-8',
    );
    expect(variant).toContain(
      '\nlayer: 3\ncluster_key: feed-thread\nexpires: 2026-01-01\n',
    );
    expect(variant).toContain('variant key order (expires before title)');
  });

  it('excludePatterns keeps matching files in place', () => {
    runScript([vault, '--config', configPath, '--execute']);

    expect(
      existsSync(join(vault, '.maencof-meta/archive/04_Action/feed/README.md')),
    ).toBe(true);
    expect(existsSync(join(vault, '99_Archive/feed/README.md'))).toBe(false);
  });

  it('recursive moveSources pick up nested files', () => {
    runScript([vault, '--config', configPath, '--execute']);

    expect(existsSync(join(vault, '99_Archive/feed/it-003.md'))).toBe(true);
    expect(
      existsSync(
        join(vault, '.maencof-meta/archive/04_Action/feed/old/it-003.md'),
      ),
    ).toBe(false);
  });

  it('links inside a moved body are rewritten at its post-move path', () => {
    // 리허설 실측 결함 재현: 이동 대상끼리의 상호 링크 — 재작성 op 가 이동 전
    // 경로를 가리키면 이동이 먼저 실행된 뒤 ENOENT 로 실행이 중단된다.
    writeVaultFile(
      vault,
      '04_Action/feed/it-005.md',
      `---
created: 2026-01-05
updated: 2026-01-06
tags: [feed]
layer: 4
title: It 005
---

See [[04_Action/feed/it-001.md]].
`,
    );

    const r = runScript([vault, '--config', configPath, '--execute']);

    expect(r.status).toBe(0);
    const moved = readFileSync(
      join(vault, '99_Archive/feed/it-005.md'),
      'utf-8',
    );
    expect(moved).toContain('[[99_Archive/feed/it-001.md]]');
  });

  it('case-fold duplicate targets are collisions at plan time', () => {
    // 실볼트 실측: 같은 항목이 소문자/대문자 파일명으로 중복 적재된 사례 —
    // 대소문자 무시 파일시스템(macOS)에서 실행 중 충돌하므로 계획 시점에 잡는다.
    writeVaultFile(
      vault,
      '04_Action/feed/it-004.md',
      FIXTURES['04_Action/feed/it-001.md']!,
    );
    writeVaultFile(
      vault,
      '.maencof-meta/archive/04_Action/feed/It-004.md',
      FIXTURES['.maencof-meta/archive/04_Action/feed/old/it-003.md']!,
    );

    const r = runScript([vault, '--config', configPath]);

    expect(r.status).toBe(0);
    const out = lastJson(r.stdout);
    expect(JSON.stringify(out.collisions)).toContain('It-004');
  });
});
