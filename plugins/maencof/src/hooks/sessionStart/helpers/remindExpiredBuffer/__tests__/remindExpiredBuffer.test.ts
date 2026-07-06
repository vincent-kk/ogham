import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runRemindExpiredBuffer } from '../remindExpiredBuffer.js';

describe('runRemindExpiredBuffer', () => {
  let vaultDirectory: string;
  let bufferDirectory: string;

  beforeEach(() => {
    vaultDirectory = mkdtempSync(join(tmpdir(), 'maencof-buffer-'));
    mkdirSync(join(vaultDirectory, '.maencof-meta'), { recursive: true });
    bufferDirectory = join(vaultDirectory, '05_Context', 'buffer');
    mkdirSync(bufferDirectory, { recursive: true });
  });

  afterEach(() => rmSync(vaultDirectory, { recursive: true, force: true }));

  function writeBufferDocument(
    relativePath: string,
    frontmatterLines: string[],
  ): void {
    const absolutePath = join(bufferDirectory, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(
      absolutePath,
      `---\n${frontmatterLines.join('\n')}\n---\nbody`,
      'utf-8',
    );
  }

  it('reminds about expired buffer documents without deleting them', () => {
    writeBufferDocument('stale-note.md', [
      'created: 2020-01-01',
      'updated: 2020-01-01',
      'tags: [buffer]',
      'layer: 5',
      'sub_layer: buffer',
      'expires: 2020-06-01',
    ]);

    const result = runRemindExpiredBuffer(vaultDirectory);

    expect(result.hookSpecificOutput).toBeDefined();
    const context = result.hookSpecificOutput?.additionalContext ?? '';
    expect(context).toContain('1 expired L5 buffer');
    expect(context).toContain('/maencof:organize');
    expect(context).toContain('/maencof:cleanup buffer');
    expect(context).toContain('05_Context/buffer/stale-note.md');
    // reminder only — nothing is deleted; caller keeps the document
  });

  it('does not remind when buffer documents are not expired', () => {
    writeBufferDocument('fresh-note.md', [
      'created: 2026-01-01',
      'updated: 2026-01-01',
      'tags: [buffer]',
      'layer: 5',
      'sub_layer: buffer',
      'expires: 2099-12-31',
    ]);

    const result = runRemindExpiredBuffer(vaultDirectory);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('ignores buffer documents without an expires field', () => {
    writeBufferDocument('no-ttl-note.md', [
      'created: 2020-01-01',
      'updated: 2020-01-01',
      'tags: [buffer]',
      'layer: 5',
      'sub_layer: buffer',
    ]);

    const result = runRemindExpiredBuffer(vaultDirectory);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('is a no-op when there is no buffer directory', () => {
    rmSync(bufferDirectory, { recursive: true, force: true });
    const result = runRemindExpiredBuffer(vaultDirectory);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('does nothing when the directory is not a maencof vault', () => {
    const nonVaultDirectory = mkdtempSync(join(tmpdir(), 'not-a-vault-'));
    try {
      const result = runRemindExpiredBuffer(nonVaultDirectory);
      expect(result.hookSpecificOutput).toBeUndefined();
    } finally {
      rmSync(nonVaultDirectory, { recursive: true, force: true });
    }
  });
});
