import { describe, expect, it } from 'vitest';

import { mergeResults } from '../../../hooks/preToolUse/utils/mergeResults.js';
import type { HookOutput } from '../../../types/hooks.js';

describe('mergeResults', () => {
  it('all continue=true → combined true', () => {
    const results: HookOutput[] = [
      { continue: true },
      { continue: true },
      { continue: true },
    ];
    const out = mergeResults(results);
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  it('one deny → merged permissionDecision deny, continue stays true', () => {
    const results: HookOutput[] = [
      { continue: true },
      {
        continue: true,
        hookSpecificOutput: {
          permissionDecision: 'deny',
          permissionDecisionReason: 'blocked',
        },
      },
      { continue: true },
    ];
    const out = mergeResults(results);
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('additionalContext from multiple results concatenated with \\n\\n', () => {
    const results: HookOutput[] = [
      { continue: true, hookSpecificOutput: { additionalContext: 'ctx-A' } },
      { continue: true, hookSpecificOutput: { additionalContext: 'ctx-B' } },
    ];
    const out = mergeResults(results);
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput?.additionalContext).toBe('ctx-A\n\nctx-B');
  });

  it('empty results → continue=true', () => {
    const out = mergeResults([]);
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput).toBeUndefined();
  });

  it('deny with reason passthrough → merged output carries the reason', () => {
    const blocker: HookOutput = {
      continue: true,
      hookSpecificOutput: {
        permissionDecision: 'deny',
        permissionDecisionReason: 'violation message',
      },
    };
    const out = mergeResults([{ continue: true }, blocker]);
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(out.hookSpecificOutput?.permissionDecisionReason).toBe(
      'violation message',
    );
  });

  it('mixed deny + context → continue=true, both permissionDecision deny and additionalContext present', () => {
    const results: HookOutput[] = [
      {
        continue: true,
        hookSpecificOutput: {
          permissionDecision: 'deny',
          permissionDecisionReason: 'organ violation',
        },
      },
      {
        continue: true,
        hookSpecificOutput: { additionalContext: 'intent context here' },
      },
    ];
    const out = mergeResults(results);
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(out.hookSpecificOutput?.permissionDecisionReason).toContain(
      'organ violation',
    );
    expect(out.hookSpecificOutput?.additionalContext).toBe(
      'intent context here',
    );
  });

  it('continue:false + deny → continue stays false AND decision is deny', () => {
    const out = mergeResults([
      {
        continue: false,
        hookSpecificOutput: {
          permissionDecision: 'deny',
          permissionDecisionReason: 'x',
        },
      },
      { continue: true },
    ]);
    expect(out.continue).toBe(false);
    expect(out.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('deny without a reason → merged output still carries a generic reason', () => {
    const out = mergeResults([
      { continue: true, hookSpecificOutput: { permissionDecision: 'deny' } },
    ]);
    expect(out.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(out.hookSpecificOutput?.permissionDecisionReason).toBeTruthy();
  });
});
