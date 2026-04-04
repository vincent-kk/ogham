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

const { enforceAgentRole } = await import('../../../hooks/agent-enforcer/agent-enforcer.js');
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

describe('agent-enforcer (guidance)', () => {
  describe('implementation agent reminder (FCA project)', () => {
    it('should inject implementation reminder for oh-my-claudecode:executor', () => {
      mockFcaProject();
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'oh-my-claudecode:executor',
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput?.additionalContext).toContain(
        'FCA-AI Pre-Implementation Check',
      );
    });

    it('should inject implementation reminder for oh-my-claudecode:deep-executor', () => {
      mockFcaProject();
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'oh-my-claudecode:deep-executor',
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput?.additionalContext).toContain(
        'FCA-AI Pre-Implementation Check',
      );
    });

    it('should inject implementation reminder for native general-purpose agent', () => {
      mockFcaProject();
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'general-purpose',
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput?.additionalContext).toContain(
        'FCA-AI Pre-Implementation Check',
      );
    });
  });

  describe('non-FCA project (no workflow guidance)', () => {
    it('should skip guidance for OMC planner in non-FCA project', () => {
      mockNonFcaProject();
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'oh-my-claudecode:planner',
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('should skip guidance for general-purpose in non-FCA project', () => {
      mockNonFcaProject();
      const result = enforceAgentRole({
        ...baseInput,
        agent_type: 'general-purpose',
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    });
  });
});
