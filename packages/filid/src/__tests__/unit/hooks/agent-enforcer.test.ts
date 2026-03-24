import { describe, expect, it, vi } from 'vitest';

import type { SubagentStartInput } from '../../../types/hooks.js';

// Mock node:fs to control isFcaProject behavior
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(() => false),
  };
});

const { enforceAgentRole } = await import('../../../hooks/agent-enforcer.js');
const { existsSync } = await import('node:fs');

const baseInput: SubagentStartInput = {
  cwd: '/workspace',
  session_id: 'test-session',
  hook_event_name: 'SubagentStart',
  agent_type: '',
  agent_id: 'test-agent-001',
};

/** Helper: make isFcaProject return true (.filid exists) */
function mockFcaProject() {
  (existsSync as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
    if (typeof p === 'string' && p.endsWith('.filid')) return true;
    return false;
  });
}

/** Helper: make isFcaProject return false */
function mockNonFcaProject() {
  (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
}

describe('agent-enforcer', () => {
  // === filid agent role restrictions (unchanged behavior) ===

  it('should restrict fractal-architect to read-only (disallow Write, Edit)', () => {
    const input: SubagentStartInput = {
      ...baseInput,
      agent_type: 'fractal-architect',
    };
    const result = enforceAgentRole(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain('Write');
    expect(result.hookSpecificOutput?.additionalContext).toContain('Edit');
  });

  it('should restrict drift-analyzer to read-only (disallow Write, Edit)', () => {
    const input: SubagentStartInput = {
      ...baseInput,
      agent_type: 'drift-analyzer',
    };
    const result = enforceAgentRole(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain('Write');
    expect(result.hookSpecificOutput?.additionalContext).toContain('Edit');
  });

  it('should restrict restructurer to approved plan scope', () => {
    const input: SubagentStartInput = {
      ...baseInput,
      agent_type: 'restructurer',
    };
    const result = enforceAgentRole(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'approved restructuring plan',
    );
  });

  it('should restrict qa-reviewer to read-only (disallow Write, Edit)', () => {
    const input: SubagentStartInput = {
      ...baseInput,
      agent_type: 'qa-reviewer',
    };
    const result = enforceAgentRole(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain('Write');
    expect(result.hookSpecificOutput?.additionalContext).toContain('Edit');
  });

  it('should restrict implementer to DETAIL.md scope', () => {
    const input: SubagentStartInput = {
      ...baseInput,
      agent_type: 'implementer',
    };
    const result = enforceAgentRole(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain('DETAIL.md');
  });

  it('should restrict context-manager to document files only', () => {
    const input: SubagentStartInput = {
      ...baseInput,
      agent_type: 'context-manager',
    };
    const result = enforceAgentRole(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain('INTENT.md');
    expect(result.hookSpecificOutput?.additionalContext).toContain('DETAIL.md');
  });

  it('should pass through unknown agent types without restrictions', () => {
    mockNonFcaProject();
    const input: SubagentStartInput = {
      ...baseInput,
      agent_type: 'custom-unknown-agent',
    };
    const result = enforceAgentRole(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('should handle empty agent_type gracefully', () => {
    mockNonFcaProject();
    const result = enforceAgentRole(baseInput);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  // === FCA workflow guidance for OMC/native agents ===

  describe('planning agent guidance (FCA project)', () => {
    it('should inject planning guidance for oh-my-claudecode:planner', () => {
      mockFcaProject();
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'oh-my-claudecode:planner',
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput?.additionalContext).toContain(
        'FCA-AI Development Workflow',
      );
      expect(result.hookSpecificOutput?.additionalContext).toContain(
        'INTENT.md',
      );
    });

    it('should inject planning guidance for oh-my-claudecode:architect', () => {
      mockFcaProject();
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'oh-my-claudecode:architect',
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput?.additionalContext).toContain(
        'FCA-AI Development Workflow',
      );
    });

    it('should inject planning guidance for oh-my-claudecode:analyst', () => {
      mockFcaProject();
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'oh-my-claudecode:analyst',
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput?.additionalContext).toContain(
        'FCA-AI Development Workflow',
      );
    });

    it('should inject planning guidance for oh-my-claudecode:critic', () => {
      mockFcaProject();
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'oh-my-claudecode:critic',
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput?.additionalContext).toContain(
        'FCA-AI Development Workflow',
      );
    });

    it('should inject planning guidance for native Plan agent', () => {
      mockFcaProject();
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'Plan',
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput?.additionalContext).toContain(
        'FCA-AI Development Workflow',
      );
    });
  });

  // === [filid:lang] tag injection ===

  describe('language tag injection', () => {
    it('should include [filid:lang] tag for filid agents', () => {
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'fractal-architect',
      });
      expect(result.hookSpecificOutput?.additionalContext).toContain(
        '[filid:lang]',
      );
    });

    it('should include [filid:lang] tag for planning agents in FCA projects', () => {
      mockFcaProject();
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'oh-my-claudecode:planner',
      });
      expect(result.hookSpecificOutput?.additionalContext).toContain(
        '[filid:lang]',
      );
    });

    it('should include [filid:lang] tag for implementation agents in FCA projects', () => {
      mockFcaProject();
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'general-purpose',
      });
      expect(result.hookSpecificOutput?.additionalContext).toContain(
        '[filid:lang]',
      );
    });

    it('should default [filid:lang] to en when no config exists', () => {
      mockFcaProject();
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'oh-my-claudecode:planner',
      });
      expect(result.hookSpecificOutput?.additionalContext).toContain(
        '[filid:lang] en',
      );
    });
  });
});
