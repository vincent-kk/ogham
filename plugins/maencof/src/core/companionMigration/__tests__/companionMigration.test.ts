import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TURN_IDENTITY_CHAR_BUDGET } from '../../../constants/companionIdentity.js';
import type { CompanionIdentity } from '../../../types/companion.js';
import { assertTurnBudget } from '../../companionBudget/index.js';
import { runCompanionMigration } from '../companionMigration.js';

describe('runCompanionMigration', () => {
  let vaultDir: string;
  let metaDir: string;
  let identityPath: string;

  beforeEach(() => {
    vaultDir = mkdtempSync(join(tmpdir(), 'maencof-migrate-'));
    metaDir = join(vaultDir, '.maencof-meta');
    mkdirSync(metaDir, { recursive: true });
    identityPath = join(metaDir, 'companion-identity.json');
  });

  afterEach(() => rmSync(vaultDir, { recursive: true, force: true }));

  function writeV1(): void {
    writeFileSync(
      identityPath,
      JSON.stringify({
        name: 'Nao',
        role: 'mirror advisor',
        personality: {
          tone: 'calm',
          approach: 'structured',
          traits: ['brief'],
        },
        principles: ['P1', 'P2'],
        taboos: ['no unauthorized deletion'],
        origin_story: 'Born to think alongside you.',
        greeting: 'Welcome back.',
        created_at: '2026-05-06T00:00:00Z',
        updated_at: '2026-05-06T00:00:00Z',
      }),
      'utf-8',
    );
  }

  function readIdentity(): CompanionIdentity {
    return JSON.parse(readFileSync(identityPath, 'utf-8')) as CompanionIdentity;
  }

  function backups(dir: string): string[] {
    return readdirSync(dir).filter((f) => f.includes('.bak-'));
  }

  it('migrates a v1 file to canonical, preserving created_at and backing up the original', () => {
    writeV1();
    const result = runCompanionMigration(vaultDir);
    expect(result).toMatchObject({ migrated: true, reason: 'migrated' });
    const v2 = readIdentity();
    expect(v2.schema_version).toBe(2);
    expect(v2.sections.find((s) => s.key === 'role')).toMatchObject({
      inject: 'both',
      salience: 5,
      detail: 'mirror advisor',
    });
    expect(v2.sections.find((s) => s.key === 'taboos')?.detail).toEqual([
      'no unauthorized deletion',
    ]);
    expect(v2.created_at.startsWith('2026-05-06')).toBe(true);
    expect(backups(metaDir).length).toBeGreaterThanOrEqual(1);
  });

  it('is idempotent — a second run is a no-op (already-current, no new backup)', () => {
    writeV1();
    runCompanionMigration(vaultDir);
    const backupsAfterFirst = backups(metaDir).length;
    const second = runCompanionMigration(vaultDir);
    expect(second).toMatchObject({
      migrated: false,
      reason: 'already-current',
    });
    expect(backups(metaDir).length).toBe(backupsAfterFirst);
  });

  it('returns no-file when the identity file is absent, and invalid for missing name/greeting', () => {
    expect(runCompanionMigration(vaultDir)).toMatchObject({
      migrated: false,
      reason: 'no-file',
    });
    writeFileSync(
      identityPath,
      JSON.stringify({ personality: 'text only' }),
      'utf-8',
    );
    expect(runCompanionMigration(vaultDir)).toMatchObject({
      migrated: false,
      reason: 'invalid',
    });
  });

  it('leaves CLAUDE.md untouched during migration (v1→v2 field mapping only)', () => {
    writeV1();
    const claudeMdPath = join(vaultDir, 'CLAUDE.md');
    const original =
      '# CLAUDE.md\n\n## Tone (Nao)\n\nNao speaks calmly in a measured register.\n\n## Other Section\n\nkeep me\n';
    writeFileSync(claudeMdPath, original, 'utf-8');
    const result = runCompanionMigration(vaultDir);
    expect(result).toMatchObject({ migrated: true, reason: 'migrated' });
    expect(readFileSync(claudeMdPath, 'utf-8')).toBe(original);
  });

  it('auto-demotes low-salience turn sections to session when migration exceeds the configured turn budget (§B1)', () => {
    writeFileSync(
      identityPath,
      JSON.stringify({
        name: 'Nao',
        role: 'r'.repeat(Math.ceil(TURN_IDENTITY_CHAR_BUDGET / 2)),
        personality: {
          tone: 'calm',
          approach: 'structured',
          traits: ['brief'],
        },
        principles: ['p'.repeat(Math.ceil(TURN_IDENTITY_CHAR_BUDGET / 2))],
        taboos: ['no unauthorized deletion'],
        origin_story: 'Born to think alongside you.',
        greeting: 'Welcome back.',
        created_at: '2026-05-06T00:00:00Z',
        updated_at: '2026-05-06T00:00:00Z',
      }),
      'utf-8',
    );
    const result = runCompanionMigration(vaultDir);
    expect(result).toMatchObject({ migrated: true, reason: 'migrated' });
    expect(result.demotedToSession ?? []).toContain('principles');
    const v2 = readIdentity();
    // the demoted section survives (not dropped), only its channel changed
    expect(v2.sections.find((s) => s.key === 'principles')?.inject).toBe(
      'session',
    );
    // the post-migration per-turn set now fits the configured budget
    expect(assertTurnBudget(v2.sections).ok).toBe(true);
  });
});
