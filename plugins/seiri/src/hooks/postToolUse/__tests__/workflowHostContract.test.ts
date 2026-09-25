import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/** Redacted host evidence, not a synthetic substitute for live host acceptance. */
interface ObservedEvent {
  /** Native event kind. */
  event: string;
  /** Stable aliases preserve equality without keeping host identifiers. */
  session: string;
  /** Codex user-turn alias. */
  turn?: string;
  /** Claude user-turn alias. */
  prompt?: string;
  /** Subagent alias, absent on the main actor. */
  agent?: string;
  /** Native tool-call alias, shared by its Pre and Post events. */
  invocation?: string;
  /** Canonical tool name emitted by the measured host. */
  tool?: string;
  /** Equality alias of the serialized input hash. */
  inputHash?: string;
  /** Native SessionStart reason. */
  source?: string;
  /** Types and object keys only; no tool output text is retained. */
  responseShape?: unknown;
}

/** Captured with Claude Code 2.1.282 and Codex CLI 0.157.0 on 2026-09-26. */
const observed = JSON.parse(
  readFileSync(
    new URL('./fixtures/workflowHost/observed.json', import.meta.url),
    'utf8',
  ),
) as { scenarios: Record<string, ObservedEvent[]> };

describe('recorded native workflow transport', () => {
  it('correlates every successful Post with its own actor, turn and input', () => {
    for (const [scenario, events] of Object.entries(observed.scenarios)) {
      for (const [index, post] of events.entries()) {
        if (post.event !== 'PostToolUse') continue;
        const pre = events
          .slice(0, index)
          .find(
            (event) =>
              event.event === 'PreToolUse' &&
              event.invocation === post.invocation,
          );
        expect(pre, `${scenario}: ${post.tool}`).toBeDefined();
        expect(post.invocation).toBeTruthy();
        expect(post.turn ?? post.prompt).toBeTruthy();
        for (const key of [
          'session',
          'turn',
          'prompt',
          'agent',
          'tool',
          'inputHash',
        ] as const)
          expect(post[key], `${scenario}: ${key}`).toEqual(pre?.[key]);
      }
    }
  });

  it.each(['claude-main', 'codex-code'])(
    '%s observes MCP and Bash completion',
    (scenario) => {
      const posts = observed.scenarios[scenario]!.filter(
        (event) => event.event === 'PostToolUse',
      );
      expect(
        posts.filter((event) => event.tool?.endsWith('__workflow')),
      ).toHaveLength(2);
      expect(posts.some((event) => event.tool === 'Bash')).toBe(true);
    },
  );

  it('keeps the distinct Claude and Codex MCP response envelopes', () => {
    const claude = observed.scenarios['claude-main']!.find(
      (event) =>
        event.event === 'PostToolUse' && event.tool?.endsWith('__workflow'),
    );
    const codex = observed.scenarios['codex-plain']!.find(
      (event) =>
        event.event === 'PostToolUse' && event.tool?.endsWith('__workflow'),
    );
    expect(Array.isArray(claude?.responseShape)).toBe(true);
    expect(codex?.responseShape).toHaveProperty('content');
  });

  it.each(['claude-subagent', 'codex-agents'])(
    '%s distinguishes child tool calls from the parent',
    (scenario) => {
      const events = observed.scenarios[scenario]!;
      const start = events.find((event) => event.event === 'SubagentStart');
      expect(start?.agent).toBeTruthy();
      const posts = events.filter((event) => event.event === 'PostToolUse');
      expect(posts).toHaveLength(3);
      expect(posts.every((event) => event.agent === start?.agent)).toBe(true);
      expect(
        events.find((event) => event.event === 'UserPromptSubmit')?.agent,
      ).toBeUndefined();
    },
  );

  it.each(['claude-compact-and-turn', 'codex-compact'])(
    '%s preserves the session through compaction',
    (scenario) => {
      const events = observed.scenarios[scenario]!;
      const compact = events.find((event) => event.source === 'compact');
      expect(compact).toBeDefined();
      expect(compact?.session).toBe(events[0]?.session);
    },
  );

  it.each(['claude-compact-and-turn', 'codex-turns'])(
    '%s changes native turn provenance on the next user message',
    (scenario) => {
      const turns = observed.scenarios[scenario]!.filter(
        (event) => event.event === 'UserPromptSubmit',
      );
      expect(turns).toHaveLength(2);
      expect(turns[0]?.session).toBe(turns[1]?.session);
      expect(turns[0]?.turn ?? turns[0]?.prompt).not.toBe(
        turns[1]?.turn ?? turns[1]?.prompt,
      );
    },
  );

  it.each(['claude-parallel', 'codex-parallel'])(
    '%s retains distinct invocation identities for concurrent requests',
    (scenario) => {
      const events = observed.scenarios[scenario]!.filter((event) =>
        event.tool?.endsWith('__workflow'),
      );
      const pres = events.filter((event) => event.event === 'PreToolUse');
      const posts = events.filter((event) => event.event === 'PostToolUse');
      expect(pres).toHaveLength(2);
      expect(posts).toHaveLength(2);
      expect(pres[0]?.invocation).not.toBe(pres[1]?.invocation);
      expect(posts.map((event) => event.invocation).sort()).toEqual(
        pres.map((event) => event.invocation).sort(),
      );
    },
  );
});
