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
      ['created: 2020-01-01', 'updated: 2020-01-01', 'tags: [note]', 'layer: 4'],
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
    } finally {
      rmSync(nonVaultDirectory, { recursive: true, force: true });
    }
  });
});
