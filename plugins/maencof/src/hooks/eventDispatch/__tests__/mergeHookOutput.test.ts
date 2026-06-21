import { describe, expect, it } from 'vitest';

import { mergeHookOutput } from '../utils/mergeHookOutput.js';

describe('mergeHookOutput', () => {
  it('empty results → bare continue:true', () => {
    expect(mergeHookOutput('PreToolUse', [])).toEqual({ continue: true });
  });

  it('single additionalContext is wrapped with the event name', () => {
    const merged = mergeHookOutput('UserPromptSubmit', [
      {
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: 'A',
        },
      },
    ]);
    expect(merged).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: 'A',
      },
    });
  });

  it('continue is AND across results', () => {
    const merged = mergeHookOutput('PreToolUse', [
      { continue: true },
      { continue: false, reason: 'no' },
    ]);
    expect(merged.continue).toBe(false);
  });

  it('concatenates multiple additionalContext with a blank line', () => {
    const merged = mergeHookOutput('SessionStart', [
      { continue: true, hookSpecificOutput: { additionalContext: 'A' } },
      { continue: true, hookSpecificOutput: { additionalContext: 'B' } },
    ]);
    expect(merged.hookSpecificOutput?.additionalContext).toBe('A\n\nB');
    expect(merged.hookSpecificOutput?.hookEventName).toBe('SessionStart');
  });

  it('collects reasons only from blocking results', () => {
    const merged = mergeHookOutput('PreToolUse', [
      { continue: false, reason: 'r1' },
      { continue: true, reason: 'ignored' },
      { continue: false, reason: 'r2' },
    ]);
    expect(merged.continue).toBe(false);
    expect(merged.reason).toBe('r1\n\nr2');
  });

  it('keeps systemMessage and message channels (terminal events)', () => {
    const merged = mergeHookOutput('SessionEnd', [
      { continue: true, message: 'recap' },
      { continue: true, systemMessage: 'sys' },
    ]);
    expect(merged.message).toBe('recap');
    expect(merged.systemMessage).toBe('sys');
    expect(merged.hookSpecificOutput).toBeUndefined();
  });

  it('a block and additionalContext coexist', () => {
    const merged = mergeHookOutput('PreToolUse', [
      { continue: false, reason: 'blocked' },
      { continue: true, hookSpecificOutput: { additionalContext: 'ctx' } },
    ]);
    expect(merged.continue).toBe(false);
    expect(merged.reason).toBe('blocked');
    expect(merged.hookSpecificOutput?.additionalContext).toBe('ctx');
  });

  it('a block without a reason omits the reason key', () => {
    const merged = mergeHookOutput('Stop', [{ continue: false }]);
    expect(merged.continue).toBe(false);
    expect(merged.reason).toBeUndefined();
  });
});
