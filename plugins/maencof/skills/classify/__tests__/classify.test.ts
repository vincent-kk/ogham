import { readFileSync } from 'node:fs';

import { expect, it } from 'vitest';

it('requires a complete disk-backed preview and target identity checks before apply', () => {
  const skill = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
  const reference = readFileSync(
    new URL('../reference.md', import.meta.url),
    'utf8',
  );
  expect(skill).toContain('kg_inventory');
  expect(skill).toContain('read-only');
  for (const clause of [
    'resolved_target_before',
    'expected_target_after',
    'source_hash',
    'occurrence',
    'inventory_changed',
    'L1',
    'basename',
    'partial',
    'concurrent',
  ])
    expect(reference).toContain(clause);
  expect(skill).toContain('same layer');
  expect(skill).toContain('same sub-layer');
});
