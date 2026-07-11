import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runArchiveExpired } from '../archiveExpired.js';

describe('runArchiveExpired', () => {
  let vaultDirectory: string;
  let actionLayerDirectory: string;
  let archiveActionDirectory: string;

  beforeEach(() => {
    vaultDirectory = mkdtempSync(join(tmpdir(), 'maencof-archive-'));
    mkdirSync(join(vaultDirectory, '.maencof-meta'), { recursive: true });
    actionLayerDirectory = join(vaultDirectory, '04_Action');
    mkdirSync(actionLayerDirectory, { recursive: true });
    archiveActionDirectory = join(
      vaultDirectory,
      '.maencof-meta',
      'archive',
      '04_Action',
    );
  });

  afterEach(() => rmSync(vaultDirectory, { recursive: true, force: true }));

  function writeActionDocument(
    relativePath: string,
    frontmatterLines: string[],
    body: string,
  ): string {
    const absolutePath = join(actionLayerDirectory, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(
      absolutePath,
      `---\n${frontmatterLines.join('\n')}\n---\n${body}`,
      'utf-8',
    );
    return absolutePath;
  }

  /** archive/04_Action 정본을 직접 배치한다 (원위치 스텁 없이 — 과거 백로그 재현). */
  function writeArchivedDocument(
    relativePath: string,
    frontmatterLines: string[],
    body: string,
  ): string {
    const absolutePath = join(archiveActionDirectory, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(
      absolutePath,
      `---\n${frontmatterLines.join('\n')}\n---\n${body}`,
      'utf-8',
    );
    return absolutePath;
  }

  it('archives an expired document and leaves a stub in place', async () => {
    const originalPath = writeActionDocument(
      'cve/expired-example.md',
      [
        'created: 2020-01-01',
        'updated: 2020-01-01',
        'tags: [cve, security]',
        'layer: 4',
        'expires: 2020-06-01',
        'title: Expired Example',
      ],
      '# Expired Example\n\nThis is the first paragraph of the expired document.\n\nRelated: [[cve/other-item]] and [[concepts/security]].',
    );

    const result = await runArchiveExpired(vaultDirectory);

    expect(result.archived).toContain('04_Action/cve/expired-example.md');
    // canonical original moved to archive
    expect(
      existsSync(join(archiveActionDirectory, 'cve/expired-example.md')),
    ).toBe(true);
    // stub left in place — connections and metadata preserved
    const stubContent = readFileSync(originalPath, 'utf-8');
    expect(stubContent).toContain('archived: true');
    expect(stubContent).toContain(
      'archive_path: ".maencof-meta/archive/04_Action/cve/expired-example.md"',
    );
    expect(stubContent).toContain('tags: [cve, security]'); // tags preserved verbatim
    expect(stubContent).toContain('[[cve/other-item]]'); // wikilinks preserved
    expect(stubContent).toContain('[[concepts/security]]');
    expect(stubContent).toContain('## Summary');
  });

  it('leaves a not-yet-expired document untouched', async () => {
    const documentPath = writeActionDocument(
      'future-note.md',
      [
        'created: 2026-01-01',
        'updated: 2026-01-01',
        'tags: [note]',
        'layer: 4',
        'expires: 2099-12-31',
      ],
      '# Future Note\n\nStill valid.',
    );

    const result = await runArchiveExpired(vaultDirectory);

    expect(result.archived).toHaveLength(0);
    expect(existsSync(documentPath)).toBe(true);
    expect(readFileSync(documentPath, 'utf-8')).not.toContain('archived: true');
  });

  it('leaves a document without an expires field untouched', async () => {
    const documentPath = writeActionDocument(
      'no-expiry-note.md',
      [
        'created: 2020-01-01',
        'updated: 2020-01-01',
        'tags: [note]',
        'layer: 4',
      ],
      '# No Expiry\n\nNo expiry date.',
    );

    const result = await runArchiveExpired(vaultDirectory);

    expect(result.archived).toHaveLength(0);
    expect(existsSync(documentPath)).toBe(true);
  });

  it('does not re-process an already-archived stub (idempotent)', async () => {
    writeActionDocument(
      'cve/idempotent-example.md',
      [
        'created: 2020-01-01',
        'updated: 2020-01-01',
        'tags: [cve]',
        'layer: 4',
        'expires: 2020-06-01',
      ],
      '# Idempotent Example\n\nBody.',
    );

    const firstResult = await runArchiveExpired(vaultDirectory);
    expect(firstResult.archived).toHaveLength(1);

    // second run: the in-place stub is archived:true, so it is skipped
    const secondResult = await runArchiveExpired(vaultDirectory);
    expect(secondResult.archived).toHaveLength(0);
  });

  it('does nothing when the directory is not a maencof vault', async () => {
    const nonVaultDirectory = mkdtempSync(join(tmpdir(), 'not-a-vault-'));
    try {
      const result = await runArchiveExpired(nonVaultDirectory);
      expect(result.archived).toHaveLength(0);
      expect(result.backfilled).toHaveLength(0);
    } finally {
      rmSync(nonVaultDirectory, { recursive: true, force: true });
    }
  });

  it('backfills a stub for an archived document missing from its original location', async () => {
    // 과거 백로그: archive에만 존재하고 원위치에 스텁이 없다 (스텁 기능 도입 전 아카이빙분)
    writeArchivedDocument(
      'geeknews/gn-123.md',
      [
        'created: 2026-03-01',
        'updated: 2026-03-01',
        'tags: [geeknews, ai]',
        'layer: 4',
      ],
      '# GN-123\n\nArchived backlog item.\n\nRelated: [[03_External/topical/ai-psychosis]].',
    );

    const result = await runArchiveExpired(vaultDirectory);

    expect(result.backfilled).toContain('04_Action/geeknews/gn-123.md');
    // 원위치에 스텁이 소급 생성됨 — dangling inbound 링크 복원
    const stubPath = join(actionLayerDirectory, 'geeknews/gn-123.md');
    expect(existsSync(stubPath)).toBe(true);
    const stub = readFileSync(stubPath, 'utf-8');
    expect(stub).toContain('archived: true');
    expect(stub).toContain(
      'archive_path: ".maencof-meta/archive/04_Action/geeknews/gn-123.md"',
    );
    expect(stub).toContain('tags: [geeknews, ai]'); // frontmatter 보존
    expect(stub).toContain('[[03_External/topical/ai-psychosis]]'); // wikilink 보존
    // 정본은 archive에 그대로 (이동 아님)
    expect(existsSync(join(archiveActionDirectory, 'geeknews/gn-123.md'))).toBe(
      true,
    );
  });

  it('does not overwrite an existing original during backfill (idempotent)', async () => {
    writeArchivedDocument(
      'cve/live-item.md',
      ['created: 2026-01-01', 'updated: 2026-01-01', 'tags: [cve]', 'layer: 4'],
      '# Archived copy',
    );
    // 원위치에 이미 live 문서가 존재 (미만료)
    const originalPath = writeActionDocument(
      'cve/live-item.md',
      [
        'created: 2026-01-01',
        'updated: 2026-06-01',
        'tags: [cve]',
        'layer: 4',
        'expires: 2099-01-01',
      ],
      '# Live CVE\n\nStill active.',
    );

    const result = await runArchiveExpired(vaultDirectory);

    expect(result.backfilled).not.toContain('04_Action/cve/live-item.md');
    // 원위치 미변경 — 덮어쓰기 없음
    const original = readFileSync(originalPath, 'utf-8');
    expect(original).toContain('# Live CVE');
    expect(original).not.toContain('archived: true');
  });

  it('archives a new expiry and backfills a legacy archived doc in the same run', async () => {
    // 정방향: 방금 만료된 live 문서
    writeActionDocument(
      'geeknews/gn-new.md',
      [
        'created: 2026-01-01',
        'updated: 2026-01-01',
        'tags: [geeknews]',
        'layer: 4',
        'expires: 2020-01-01',
      ],
      '# GN-new\n\nJust expired.',
    );
    // 역방향: 원위치 스텁 없는 과거 백로그
    writeArchivedDocument(
      'geeknews/gn-legacy.md',
      [
        'created: 2026-02-01',
        'updated: 2026-02-01',
        'tags: [geeknews]',
        'layer: 4',
      ],
      '# GN-legacy\n\nOld backlog.',
    );

    const result = await runArchiveExpired(vaultDirectory);

    // 정방향: gn-new 아카이빙 + 원위치 스텁
    expect(result.archived).toContain('04_Action/geeknews/gn-new.md');
    expect(existsSync(join(archiveActionDirectory, 'geeknews/gn-new.md'))).toBe(
      true,
    );
    expect(
      readFileSync(join(actionLayerDirectory, 'geeknews/gn-new.md'), 'utf-8'),
    ).toContain('archived: true');
    // 역방향: gn-legacy 백필
    expect(result.backfilled).toContain('04_Action/geeknews/gn-legacy.md');
    expect(
      existsSync(join(actionLayerDirectory, 'geeknews/gn-legacy.md')),
    ).toBe(true);
    // 정방향이 남긴 스텁을 역방향이 이중 처리하지 않음
    expect(result.backfilled).not.toContain('04_Action/geeknews/gn-new.md');
  });
});
