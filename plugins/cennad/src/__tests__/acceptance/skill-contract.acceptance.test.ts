import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SKILLS_DIR = join(import.meta.dirname, '..', '..', '..', 'skills');

function readSkill(provider: string): string {
  return readFileSync(join(SKILLS_DIR, provider, 'SKILL.md'), 'utf8');
}

describe('[acceptance] provider skill contracts', () => {
  it.each(['antigravity', 'codex', 'claude'])(
    'passes an explicit continue tier through for %s',
    (provider) => {
      const skill = readSkill(provider);
      expect(skill).toContain(
        'mcp__plugin_cennad_tools__continue_conversation({ session_id, prompt, tier? })',
      );
      expect(skill).toContain('Pass `tier` only when the user supplied one');
      expect(skill).not.toContain('Drop `tier`');
      // Omitting tier on resume must keep the session's model — tiers select a
      // model now, so falling back to default_tier would switch it mid-thread.
      expect(skill).toContain('resumes on the model it started with');
    },
  );

  it('states the actual Claude isolation boundary', () => {
    const skill = readSkill('claude');
    expect(skill).toContain("Claude Code's built-in tools");
    expect(skill).toContain('spawned\n  working directory');
    expect(skill).not.toContain('no shared\n  context or tool access');
    expect(skill).not.toContain('the child cannot see them');
  });
});
