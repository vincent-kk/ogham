import { bench, describe } from 'vitest';

import { handleUserPromptSubmit } from '../../../hooks/user-prompt-submit/user-prompt-submit.js';
import { generateUserPromptInput } from '../fixtures/generator.js';

// pre-generate inputs per tier
const inputS = generateUserPromptInput('S');
const inputM = generateUserPromptInput('M');
const inputL = generateUserPromptInput('L');
const inputXL = generateUserPromptInput('XL');

// inputs by cwd path depth
const cwdInputs = [
  { label: 'shallow cwd (depth 1)', cwd: '/workspace' },
  { label: 'medium cwd (depth 4)', cwd: '/workspace/packages/filid/src' },
  {
    label: 'deep cwd (depth 8)',
    cwd: '/workspace/packages/filid/src/hooks/utils/helpers/types/core',
  },
  {
    label: 'very deep cwd (depth 12)',
    cwd: '/workspace/a/b/c/d/e/f/g/h/i/j/k/l',
  },
].map(({ label, cwd }) => ({
  label,
  input: {
    cwd,
    session_id: 'bench-session',
    hook_event_name: 'UserPromptSubmit' as const,
    prompt: 'Fix the bug',
  },
}));

describe('user-prompt-submit: project size tiers', () => {
  bench('S: short prompt', () => {
    handleUserPromptSubmit(inputS);
  });

  bench('M: medium prompt', () => {
    handleUserPromptSubmit(inputM);
  });

  bench('L: long prompt', () => {
    handleUserPromptSubmit(inputL);
  });

  bench('XL: very long prompt', () => {
    handleUserPromptSubmit(inputXL);
  });
});

describe('user-prompt-submit: cwd path depth', () => {
  for (const { label, input } of cwdInputs) {
    bench(label, () => {
      handleUserPromptSubmit(input);
    });
  }
});

describe('user-prompt-submit: sustained injection', () => {
  // same session: 1 inject on first call + 99 session gate early returns
  bench('100 calls, same session (1 inject + 99 gate checks)', () => {
    const sessionInput = { ...inputS, session_id: 'bench-sustained' };
    for (let i = 0; i < 100; i++) {
      handleUserPromptSubmit(sessionInput);
    }
  });

  // unique sessions: new session on every call (100 injects)
  bench('100 calls, unique sessions (100 injects)', () => {
    for (let i = 0; i < 100; i++) {
      handleUserPromptSubmit({ ...inputS, session_id: `bench-unique-${i}` });
    }
  });
});
