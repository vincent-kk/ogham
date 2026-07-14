import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const PLUGIN_DIR = join(import.meta.dirname, '..', '..', '..');

function rawDoc(...segments: string[]): string {
  return readFileSync(join(PLUGIN_DIR, ...segments), 'utf8');
}

// Match on meaning, not on line-wrapping: prose re-flow must never break a contract test.
function readDoc(...segments: string[]): string {
  return rawDoc(...segments).replace(/\s+/g, ' ');
}

function readSkill(provider: string): string {
  return readDoc('skills', provider, 'SKILL.md');
}

// Only the frontmatter `tools:` grants decide whether the subagent can actually
// call the tools; a short form there fails to resolve and dispatch dies silently.
function courierToolGrants(): string[] {
  const frontmatter = rawDoc('agents', 'courier.md').split('---')[1] ?? '';
  return [...frontmatter.matchAll(/^\s*-\s*(\S+)\s*$/gm)].map((m) => m[1]);
}

describe('[acceptance] cennad delegation contracts', () => {
  it('grants the courier the full-form tool names it dispatches through', () => {
    expect(courierToolGrants()).toEqual([
      'mcp__plugin_cennad_tools__start_conversation',
      'mcp__plugin_cennad_tools__continue_conversation',
    ]);
  });

  it('keeps the provider call and tier semantics in the courier', () => {
    const courier = readDoc('agents', 'courier.md');

    expect(courier).toContain(
      'mcp__plugin_cennad_tools__start_conversation({ provider, prompt, tier? })',
    );
    expect(courier).toContain(
      'mcp__plugin_cennad_tools__continue_conversation({ session_id, prompt, tier? })',
    );
    expect(courier).toContain(
      'Include `tier` only when the caller supplied one',
    );
    expect(courier).not.toMatch(/drop `tier`/i);
    // Omitting tier on resume must keep the session's model — tiers select a
    // model now, so falling back to default_tier would switch it mid-thread.
    expect(courier).toContain(
      'keeps the tier — and therefore the model — it started with',
    );
    expect(courier).toContain('continues the SAME session');
    expect(courier).toContain('never a fresh `start`');
  });

  it('holds the courier to its refinement budget and never discards a good answer', () => {
    const courier = readDoc('agents', 'courier.md');

    // An offer of extras is not a gap; spending a call on one refines nothing.
    expect(courier).toContain(
      "is not a gap — never accept on the user's behalf",
    );
    expect(courier).toContain('only when the 1st made material progress');
    // A failure on a refinement call must not throw away an answer already obtained.
    expect(courier).toContain('best successful answer so far');
  });

  it.each(['antigravity', 'codex', 'claude'])(
    'keeps %s a thin dispatch mapper over the courier',
    (provider) => {
      const skill = readSkill(provider);

      expect(skill).toContain('Spawn `cennad:courier`');
      expect(skill).toContain('Omit unless the user asked');
      expect(skill).not.toMatch(/drop `tier`/i);
      // Judgment and the MCP call shape belong to the courier — a skill that
      // re-inlines the tool signature has re-absorbed the provider interaction.
      expect(skill).not.toMatch(/(start|continue)_conversation\(\{/);
    },
  );

  it('states the actual Claude isolation boundary', () => {
    const skill = readSkill('claude');

    // Isolation is asymmetric: no inherited context, but the child does reach
    // the caller's files. Naming the directory and its bound is the whole point.
    expect(skill).toContain(
      "Claude Code's built-in tools in the spawned working directory",
    );
    expect(skill).toContain('bounded by the configured permission mode');
    expect(skill).not.toMatch(/no shared context or tool access/i);
    expect(skill).not.toMatch(/the child cannot see them/i);
  });
});
