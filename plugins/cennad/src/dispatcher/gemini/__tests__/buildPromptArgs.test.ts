import { describe, expect, it } from 'vitest';

import type { GeminiFlags } from '../../../types/index.js';
import { buildPromptArgs } from '../utils/buildPromptArgs.js';

const SANDBOX_AUTO: GeminiFlags = {
  yolo: false,
  sandbox: true,
  sandbox_backend: 'auto',
};

describe('gemini buildPromptArgs', () => {
  it('emits -p <prompt> as the trailing pair', () => {
    const args = buildPromptArgs({
      model: null,
      prompt: 'hi',
      flags: SANDBOX_AUTO,
    });
    expect(args.slice(-2)).toEqual(['-p', 'hi']);
  });

  it('omits -m when model is null', () => {
    const args = buildPromptArgs({
      model: null,
      prompt: 'hi',
      flags: SANDBOX_AUTO,
    });
    expect(args).not.toContain('-m');
  });

  it('emits -m <model> when model is provided', () => {
    const args = buildPromptArgs({
      model: 'gemini-x',
      prompt: 'hi',
      flags: SANDBOX_AUTO,
    });
    const i = args.indexOf('-m');
    expect(args[i + 1]).toBe('gemini-x');
  });

  it('emits --yolo only when flags.yolo=true', () => {
    expect(
      buildPromptArgs({ model: null, prompt: 'hi', flags: SANDBOX_AUTO }),
    ).not.toContain('--yolo');
    expect(
      buildPromptArgs({
        model: null,
        prompt: 'hi',
        flags: { ...SANDBOX_AUTO, yolo: true },
      }),
    ).toContain('--yolo');
  });

  it('emits --sandbox only when flags.sandbox=true', () => {
    expect(
      buildPromptArgs({ model: null, prompt: 'hi', flags: SANDBOX_AUTO }),
    ).toContain('--sandbox');
    expect(
      buildPromptArgs({
        model: null,
        prompt: 'hi',
        flags: { ...SANDBOX_AUTO, sandbox: false },
      }),
    ).not.toContain('--sandbox');
  });

  it('prefixes --resume <index> when resumeIndex is provided', () => {
    const args = buildPromptArgs({
      model: null,
      prompt: 'hi',
      flags: SANDBOX_AUTO,
      resumeIndex: 7,
    });
    expect(args.slice(0, 2)).toEqual(['--resume', '7']);
  });
});
