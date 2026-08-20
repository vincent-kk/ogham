/**
 * @file l4ArchiveRelocate.test.ts
 * @description legacy L4 아카이브 → 99_Archive/actions 이관 스크립트 블랙박스 검증 —
 * tmp 픽스처 볼트에 skills/migrate/scripts/l4-archive-relocate.mjs 를 spawn 하고
 * dry-run 무변경·정본 이동/스텁 접두 재작성·anomaly 격리·collision 정지(exit 3)·
 * 비볼트 거부(exit 2)·legacy 루트 부재 no-op 을 파일시스템 결과로 판정한다.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// 저장소 관례(publicationMigrate 테스트와 동형): fileURLToPath(import.meta.url)
const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../skills/migrate/scripts/l4-archive-relocate.mjs',
);

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

/** 볼트 파일 스냅샷 — posix 상대경로 → content (파일만; mtime 비교 제외). */
function snapshotVault(root: string): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else
        map.set(
          relative(root, abs).split(sep).join('/'),
          readFileSync(abs, 'utf-8'),
        );
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

function stubDocument(rel: string, archivePathPrefix: string): string {
  return `---
created: 2026-05-01
updated: 2026-08-20
tags: [project]
layer: 4
archived: true
archive_path: "${archivePathPrefix}${rel}"
title: Stub of ${rel}
---
# Stub of ${rel}

> 📦 Archived — canonical original at: \`${archivePathPrefix}${rel}\`
> Meta-knowledge is distilled to L2 when harvested via \`/archive-harvest\`.

## Summary
First paragraph summary.

## Links (preserved)
- [[01_Core/identity]]
`;
}

function originalDocument(title: string): string {
  return `---
created: 2026-01-01
updated: 2026-01-02
tags: [project]
layer: 4
expires: 2026-02-01
title: ${title}
---
# ${title}

Body of ${title}.
`;
}

const LEGACY = '.maencof-meta/archive/04_Action/';
const NEW = '99_Archive/actions/';

describe('l4-archive-relocate.mjs', () => {
  let vault: string;

  beforeEach(() => {
    vault = mkdtempSync(join(tmpdir(), 'maencof-l4-relocate-'));
    mkdirSync(join(vault, '.maencof-meta'), { recursive: true });
  });

  afterEach(() => rmSync(vault, { recursive: true, force: true }));

  /** 표준 픽스처: 정본 3(스텁 2 + 스텁 없는 1), live 1, 이미 이관된 스텁 1, anomaly 스텁 1 */
  function seedStandardFixture(): void {
    // legacy 정본 — 서브디렉토리 구조 + 한글 파일명 포함
    writeVaultFile(
      vault,
      `${LEGACY}projects/note-a.md`,
      originalDocument('Note A'),
    );
    writeVaultFile(
      vault,
      `${LEGACY}research/계획-추가.md`,
      originalDocument('계획 추가'),
    );
    writeVaultFile(
      vault,
      `${LEGACY}geeknews/gn-1.md`,
      originalDocument('GN 1'),
    );
    // 대응 스텁 (gn-1 은 스텁 없음 — 백필 대상일 뿐 anomaly 아님)
    writeVaultFile(
      vault,
      '04_Action/projects/note-a.md',
      stubDocument('projects/note-a.md', LEGACY),
    );
    writeVaultFile(
      vault,
      '04_Action/research/계획-추가.md',
      stubDocument('research/계획-추가.md', LEGACY),
    );
    // live 문서 — 대상 아님
    writeVaultFile(
      vault,
      '04_Action/projects/live.md',
      `---\ncreated: 2026-06-01\nupdated: 2026-06-01\ntags: [project]\nlayer: 4\nexpires: 2099-01-01\n---\n# Live\n\nStill active.\n`,
    );
    // 이미 신규 접두로 이관된 스텁 + 그 정본 — 재작성 대상 아님
    writeVaultFile(
      vault,
      '04_Action/cve/done.md',
      stubDocument('cve/done.md', NEW),
    );
    writeVaultFile(vault, `${NEW}cve/done.md`, originalDocument('Done'));
    // anomaly: legacy 접두 스텁인데 정본이 양 루트 어디에도 없음
    writeVaultFile(
      vault,
      '04_Action/projects/ghost.md',
      stubDocument('projects/ghost.md', LEGACY),
    );
  }

  it('dry-run reports counts and writes nothing', () => {
    seedStandardFixture();
    const before = snapshotVault(vault);
    const reportPath = join(
      vault,
      '.maencof-meta',
      'tmp',
      'l4-relocate-report.json',
    );

    const result = runScript([vault, '--report', reportPath]);

    expect(result.status).toBe(0);
    const payload = lastJson(result.stdout);
    expect(payload.mode).toBe('dry-run');
    expect(payload.moves).toBe(3);
    expect(payload.stubRewrites).toBe(2);
    expect((payload.anomalies as unknown[]).length).toBe(1);
    expect((payload.collisions as unknown[]).length).toBe(0);
    // report 파일 밖에는 아무것도 쓰지 않는다
    const report = JSON.parse(readFileSync(reportPath, 'utf-8')) as {
      moves: unknown[];
      stubRewrites: unknown[];
    };
    expect(report.moves).toHaveLength(3);
    expect(report.stubRewrites).toHaveLength(2);
    rmSync(join(vault, '.maencof-meta', 'tmp'), {
      recursive: true,
      force: true,
    });
    expect(snapshotVault(vault)).toEqual(before);
  });

  it('execute moves originals, rewrites stub prefixes, and empties the legacy root', () => {
    seedStandardFixture();

    const result = runScript([vault, '--execute']);

    expect(result.status).toBe(0);
    const payload = lastJson(result.stdout);
    expect(payload.mode).toBe('execute');
    expect(payload.moved).toBe(3);
    expect(payload.rewritten).toBe(2);
    // 정본이 신규 루트로 이동 (한글 파일명 포함), 내용 보존
    expect(
      readFileSync(join(vault, `${NEW}projects/note-a.md`), 'utf-8'),
    ).toContain('# Note A');
    expect(
      readFileSync(join(vault, `${NEW}research/계획-추가.md`), 'utf-8'),
    ).toContain('# 계획 추가');
    expect(existsSync(join(vault, `${NEW}geeknews/gn-1.md`))).toBe(true);
    // legacy 루트는 비워지고 제거된다 (.maencof-meta/archive 자체는 유지)
    expect(existsSync(join(vault, '.maencof-meta/archive/04_Action'))).toBe(
      false,
    );
    expect(existsSync(join(vault, '.maencof-meta/archive'))).toBe(true);
    // 스텁 접두 재작성 — frontmatter 와 body callout 둘 다
    const stub = readFileSync(
      join(vault, '04_Action/projects/note-a.md'),
      'utf-8',
    );
    expect(stub).toContain(
      'archive_path: "99_Archive/actions/projects/note-a.md"',
    );
    expect(stub).toContain(
      'canonical original at: `99_Archive/actions/projects/note-a.md`',
    );
    expect(stub).not.toContain('.maencof-meta/archive/04_Action/');
    // live·이미 이관된 스텁·anomaly 스텁은 불변
    expect(
      readFileSync(join(vault, '04_Action/projects/live.md'), 'utf-8'),
    ).not.toContain('99_Archive');
    expect(
      readFileSync(join(vault, '04_Action/cve/done.md'), 'utf-8'),
    ).toContain(`archive_path: "${NEW}cve/done.md"`);
    expect(
      readFileSync(join(vault, '04_Action/projects/ghost.md'), 'utf-8'),
    ).toContain(`archive_path: "${LEGACY}projects/ghost.md"`);
  });

  it('isolates an anomaly stub whose original exists in neither root', () => {
    seedStandardFixture();

    const dry = runScript([vault]);
    const anomalies = lastJson(dry.stdout).anomalies as Array<{ path: string }>;

    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]!.path).toBe('04_Action/projects/ghost.md');
  });

  it('stops with exit 3 and writes nothing when a move target already exists', () => {
    seedStandardFixture();
    writeVaultFile(
      vault,
      `${NEW}projects/note-a.md`,
      '# pre-existing target\n',
    );
    const before = snapshotVault(vault);

    const dry = runScript([vault]);
    expect(dry.status).toBe(0);
    expect((lastJson(dry.stdout).collisions as unknown[]).length).toBe(1);

    const exec = runScript([vault, '--execute']);
    expect(exec.status).toBe(3);
    expect(snapshotVault(vault)).toEqual(before);
  });

  it('is a no-op success on a vault without the legacy root', () => {
    writeVaultFile(
      vault,
      '04_Action/projects/live.md',
      originalDocument('Live'),
    );

    const result = runScript([vault, '--execute']);

    expect(result.status).toBe(0);
    const payload = lastJson(result.stdout);
    expect(payload.moved).toBe(0);
    expect(payload.rewritten).toBe(0);
  });

  it('rejects a directory that is not a maencof vault with exit 2', () => {
    const notVault = mkdtempSync(join(tmpdir(), 'not-a-vault-'));
    try {
      const result = runScript([notVault]);
      expect(result.status).toBe(2);
    } finally {
      rmSync(notVault, { recursive: true, force: true });
    }
  });
});
