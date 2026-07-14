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
import type { CompanionEditInput } from '../../../types/mcpCompanion.js';
import { applyCompanionEdit } from '../companionEdit.js';

describe('applyCompanionEdit — preview/commit two-step + gates', () => {
  let vaultDir: string;
  let metaDir: string;
  let identityPath: string;

  beforeEach(() => {
    vaultDir = mkdtempSync(join(tmpdir(), 'maencof-edit-'));
    metaDir = join(vaultDir, '.maencof-meta');
    mkdirSync(metaDir, { recursive: true });
    identityPath = join(metaDir, 'companion-identity.json');
    writeFileSync(
      identityPath,
      JSON.stringify({
        schema_version: 2,
        name: 'Nao',
        greeting: 'Hi',
        sections: [
          { key: 'tone', inject: 'both', salience: 5, detail: 'calm' },
          {
            key: 'origin',
            inject: 'session',
            salience: 1,
            detail: 'a backstory',
          },
        ],
        created_at: '2026-07-07T00:00:00Z',
        updated_at: '2026-07-07T00:00:00Z',
      }),
      'utf-8',
    );
  });

  afterEach(() => rmSync(vaultDir, { recursive: true, force: true }));

  const edit = (input: CompanionEditInput) =>
    applyCompanionEdit(vaultDir, input);
  const raw = () => readFileSync(identityPath, 'utf-8');
  const backups = () => readdirSync(metaDir).filter((f) => f.includes('.bak-'));

  it('preview leaves the file unchanged and does not commit', () => {
    const before = raw();
    const result = edit({
      operation: 'add_section',
      section: { key: 'humor', inject: 'turn', salience: 2, detail: 'dry wit' },
    });
    expect(result.success).toBe(true);
    expect(result.committed).toBe(false);
    expect(raw()).toBe(before);
    expect(backups()).toHaveLength(0);
  });

  it('commit backs up then writes the change', () => {
    const result = edit({
      operation: 'add_section',
      section: { key: 'humor', inject: 'turn', salience: 2, detail: 'dry wit' },
      commit: true,
    });
    expect(result.committed).toBe(true);
    expect(result.backup_path).toBeDefined();
    expect(backups()).toHaveLength(1);
    expect(raw()).toContain('"humor"');
  });

  it('rejects adding a section whose key already exists', () => {
    const result = edit({
      operation: 'add_section',
      section: { key: 'tone', inject: 'turn', salience: 2, detail: 'x' },
      commit: true,
    });
    expect(result.success).toBe(false);
    expect(result.committed).toBe(false);
  });

  it('updates an existing section by key, merging only provided fields', () => {
    const result = edit({
      operation: 'update_section',
      key: 'tone',
      section: { detail: 'calm and concise' },
      commit: true,
    });
    expect(result.committed).toBe(true);
    expect(raw()).toContain('calm and concise');
  });

  it('removes a section but refuses to remove the last one', () => {
    expect(
      edit({ operation: 'remove_section', key: 'origin', commit: true })
        .committed,
    ).toBe(true);
    const removeLast = edit({
      operation: 'remove_section',
      key: 'tone',
      commit: true,
    });
    expect(removeLast.success).toBe(false);
    expect(removeLast.errors.join(' ')).toContain('last section');
  });

  it('update_core changes name/greeting', () => {
    const result = edit({
      operation: 'update_core',
      core: { greeting: 'Good to see you' },
      commit: true,
    });
    expect(result.committed).toBe(true);
    expect(raw()).toContain('Good to see you');
  });

  it('refuses to commit an over-budget per-turn section and reports the offender', () => {
    const result = edit({
      operation: 'add_section',
      section: {
        key: 'bloat',
        inject: 'both',
        salience: 4,
        detail: 'x'.repeat(TURN_IDENTITY_CHAR_BUDGET + 1),
      },
      commit: true,
    });
    expect(result.committed).toBe(false);
    expect(result.turn_budget.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('budget'))).toBe(true);
    expect(backups()).toHaveLength(0);
  });

  it('refuses a brief that is not shorter than its detail', () => {
    const result = edit({
      operation: 'add_section',
      section: {
        key: 'q',
        inject: 'turn',
        salience: 2,
        detail: 'short',
        brief: 'a much longer brief string',
      },
      commit: true,
    });
    expect(result.committed).toBe(false);
    expect(result.errors.some((e) => e.includes('brief'))).toBe(true);
  });

  it('fails cleanly when the identity file is missing', () => {
    rmSync(identityPath);
    const result = edit({ operation: 'update_core', core: { greeting: 'hi' } });
    expect(result.success).toBe(false);
    expect(result.identity_preview).toBeNull();
  });

  it('accepts array detail/brief and persists them as arrays (joined with | at render)', () => {
    const result = edit({
      operation: 'add_section',
      section: {
        key: 'principles',
        inject: 'both',
        salience: 4,
        detail: ['retrieval over collection', 'rigorous links', 'brevity'],
        brief: ['retrieval', 'links', 'brevity'],
      },
      commit: true,
    });
    expect(result.committed).toBe(true);
    const saved = JSON.parse(raw()) as {
      sections: { key: string; detail: unknown }[];
    };
    const principles = saved.sections.find((s) => s.key === 'principles');
    expect(Array.isArray(principles?.detail)).toBe(true);
    expect(principles?.detail).toHaveLength(3);
  });

  describe('monotone per-turn budget gate (§B1)', () => {
    const writeOverBudget = () =>
      writeFileSync(
        identityPath,
        JSON.stringify({
          schema_version: 2,
          name: 'Nao',
          greeting: 'Hi',
          sections: [
            {
              key: 'alpha',
              inject: 'both',
              salience: 5,
              detail: 'a'.repeat(TURN_IDENTITY_CHAR_BUDGET + 200),
            },
            {
              key: 'beta',
              inject: 'turn',
              salience: 4,
              detail: 'b'.repeat(TURN_IDENTITY_CHAR_BUDGET + 100),
            },
          ],
          created_at: '2026-07-07T00:00:00Z',
          updated_at: '2026-07-07T00:00:00Z',
        }),
        'utf-8',
      );

    it('commits a reducing edit even while the set stays over the configured budget', () => {
      writeOverBudget();
      const result = edit({
        operation: 'update_section',
        key: 'alpha',
        section: { brief: 'a'.repeat(TURN_IDENTITY_CHAR_BUDGET + 100) },
        commit: true,
      });
      expect(result.committed).toBe(true);
      expect(result.turn_budget.ok).toBe(false);
      expect(raw()).toContain('"brief"');
    });

    it('refuses an edit that worsens an already-over-budget set', () => {
      writeOverBudget();
      const result = edit({
        operation: 'add_section',
        section: {
          key: 'gamma',
          inject: 'turn',
          salience: 3,
          detail: 'c'.repeat(TURN_IDENTITY_CHAR_BUDGET + 1),
        },
        commit: true,
      });
      expect(result.committed).toBe(false);
      expect(result.errors.some((e) => e.includes('worsen'))).toBe(true);
      expect(backups()).toHaveLength(0);
    });

    it('commits a budget-neutral edit on an over-budget file', () => {
      writeOverBudget();
      const result = edit({
        operation: 'update_core',
        core: { greeting: 'Good to see you' },
        commit: true,
      });
      expect(result.committed).toBe(true);
      expect(raw()).toContain('Good to see you');
    });
  });
});
