import { describe, expect, it } from 'vitest';

import { resolveCodexEffort } from '../operations/reasoningEffort.js';

describe('resolveCodexEffort', () => {
  it('maps each concrete tier to a codex reasoning-effort level', () => {
    expect(resolveCodexEffort('high')).toBe('high');
    expect(resolveCodexEffort('mid')).toBe('medium');
    expect(resolveCodexEffort('low')).toBe('low');
  });
});
