import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readCompanionIdentity } from '../readCompanionIdentity.js';

describe('readCompanionIdentity — load + normalize to canonical', () => {
  let vaultDir: string;

  beforeEach(() => {
    vaultDir = mkdtempSync(join(tmpdir(), 'maencof-read-companion-'));
    mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  });

  afterEach(() => rmSync(vaultDir, { recursive: true, force: true }));

  function write(data: unknown): void {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'companion-identity.json'),
      typeof data === 'string' ? data : JSON.stringify(data),
      'utf-8',
    );
  }

  it('normalizes a v1 file into canonical sections (graceful, pre-migration)', () => {
    write({
      name: 'Nao',
      role: 'advisor',
      personality: { tone: 'calm', approach: 'structured', traits: ['brief'] },
      principles: ['P1'],
      taboos: ['T1'],
      origin_story: 'A backstory.',
      greeting: 'Hi',
      created_at: '2026-05-06T00:00:00Z',
      updated_at: '2026-05-06T00:00:00Z',
    });
    const result = readCompanionIdentity(vaultDir);
    expect(result?.schema_version).toBe(2);
    expect(result?.sections.find((s) => s.key === 'tone')?.detail).toBe('calm');
    expect(result?.sections.find((s) => s.key === 'taboos')?.detail).toBe('T1');
  });

  it('returns an already-canonical file as sections', () => {
    write({
      schema_version: 2,
      name: 'Nao',
      greeting: 'Hi',
      sections: [{ key: 'tone', inject: 'both', salience: 5, detail: 'calm' }],
      created_at: '2026-07-07T00:00:00Z',
      updated_at: '2026-07-07T00:00:00Z',
    });
    expect(readCompanionIdentity(vaultDir)?.sections).toHaveLength(1);
  });

  it('accepts a prose-string personality vault (2026-07-04 regression shape)', () => {
    write({ name: 'Cael', greeting: 'Hi', personality: 'terse but incisive' });
    const result = readCompanionIdentity(vaultDir);
    expect(result?.sections.find((s) => s.key === 'tone')?.detail).toBe(
      'terse but incisive',
    );
  });

  it('returns null for missing file, broken JSON, and missing name/greeting', () => {
    expect(readCompanionIdentity(vaultDir)).toBeNull();
    write('{not json');
    expect(readCompanionIdentity(vaultDir)).toBeNull();
    write({ personality: 'text only' });
    expect(readCompanionIdentity(vaultDir)).toBeNull();
  });
});
