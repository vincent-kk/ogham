import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const skill = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
const reference = readFileSync(
  new URL('../reference.md', import.meta.url),
  'utf8',
);

describe('setup instruction contract', () => {
  it('captures the invocation directory and gates writes on the live connection', () => {
    expect(skill).toContain('vaultRoot');
    expect(skill).toContain('kg_status.vaultPath');
    expect(skill).toContain('setup-vault.cjs');
    expect(skill).toContain('before any knowledge write');
  });
  it('does not recommend a home vault or replace the captured root from env', () => {
    expect(skill + reference).not.toContain('~/.maencof/');
    expect(skill).not.toContain('${MAENCOF_VAULT_PATH:-');
    expect(skill).toContain('non-destructive');
  });
});
