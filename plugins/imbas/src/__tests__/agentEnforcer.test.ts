/**
 * @file agentEnforcer.test.ts
 * @description Tests for SubagentStart hook agent-enforcer.
 *   Verifies AGENT_CONSTRAINTS injection for bare and plugin-namespaced
 *   agent types, and pass-through for unknown or missing types.
 */
import { describe, expect, it } from 'vitest';

import { processAgentEnforcer } from '../hooks/agentEnforcer/agentEnforcer.js';
import type { SubagentStartInput } from '../types/hooks.js';

function makeInput(agentType: string | undefined): SubagentStartInput {
  return {
    cwd: '/tmp',
    session_id: 'test-session',
    hook_event_name: 'SubagentStart',
    agent_type: agentType as string,
    agent_id: 'agent-1',
  };
}

describe('processAgentEnforcer', () => {
  it('injects constraint for a bare imbas agent type', () => {
    const result = processAgentEnforcer(makeInput('engineer'));
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      '[imbas:engineer]',
    );
    expect(result.continue).toBe(true);
  });

  it('injects constraint for a plugin-namespaced agent type', () => {
    const result = processAgentEnforcer(makeInput('imbas:analyst'));
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      '[imbas:analyst]',
    );
  });

  it('passes through unknown agent types without context', () => {
    const result = processAgentEnforcer(makeInput('general-purpose'));
    expect(result).toEqual({ continue: true });
  });

  it('passes through when agent_type is missing', () => {
    const result = processAgentEnforcer(makeInput(undefined));
    expect(result).toEqual({ continue: true });
  });

  it('does not strip a foreign plugin namespace into a false match', () => {
    const result = processAgentEnforcer(makeInput('filid:engineer'));
    expect(result).toEqual({ continue: true });
  });
});
