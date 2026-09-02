import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HookOutput } from '../../types/hooks.js';
import { writeHookOutput } from '../shared/writeHookOutput.js';

describe('writeHookOutput', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { name: 'a bare pass result', output: { continue: true } },
    {
      name: 'an event result without context',
      output: {
        continue: true,
        hookSpecificOutput: { hookEventName: 'PostToolUse' },
      },
    },
    {
      name: 'a blank context result',
      output: {
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: '  ',
        },
      },
    },
  ] satisfies readonly { name: string; output: HookOutput }[])(
    'keeps stdout empty for $name',
    ({ output }) => {
      const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
      writeHookOutput(output);
      expect(write).not.toHaveBeenCalled();
    },
  );

  it('writes the full envelope when additional context is meaningful', () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const output: HookOutput = {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: '[seiri] Active rules: naming',
      },
    };

    writeHookOutput(output);

    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith(JSON.stringify(output));
  });
});
