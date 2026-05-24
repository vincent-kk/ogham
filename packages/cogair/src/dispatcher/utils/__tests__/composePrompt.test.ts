import { describe, expect, it } from 'vitest';

import { composePrompt } from '../composePrompt.js';

const FIXED_TODAY = '2026-05-24';

describe('composePrompt', () => {
  it('passes prompt through when level=off and preamble empty', () => {
    expect(
      composePrompt({
        prompt: 'hello',
        preamble: '',
        recencyLevel: 'off',
        today: FIXED_TODAY,
      }),
    ).toBe('hello');
  });

  it('preamble-only injects preamble before prompt', () => {
    const out = composePrompt({
      prompt: 'task',
      preamble: 'Be terse.',
      recencyLevel: 'off',
      today: FIXED_TODAY,
    });
    expect(out).toBe('Be terse.\n\ntask');
  });

  it('whitespace-only preamble counts as empty', () => {
    expect(
      composePrompt({
        prompt: 'p',
        preamble: '   \n  ',
        recencyLevel: 'off',
        today: FIXED_TODAY,
      }),
    ).toBe('p');
  });

  it('normal wraps with <recency_policy> and substitutes {today}', () => {
    const out = composePrompt({
      prompt: 'price today?',
      preamble: '',
      recencyLevel: 'normal',
      today: FIXED_TODAY,
    });
    expect(out.startsWith('<recency_policy>\n')).toBe(true);
    expect(out.includes(`오늘은 ${FIXED_TODAY}입니다`)).toBe(true);
    expect(out.includes('</recency_policy>')).toBe(true);
    expect(out.endsWith('\n\nprice today?')).toBe(true);
    expect(out.includes('{today}')).toBe(false);
  });

  it('strict uses strict body', () => {
    const out = composePrompt({
      prompt: 'q',
      preamble: '',
      recencyLevel: 'strict',
      today: FIXED_TODAY,
    });
    expect(out.includes('엄격히 따라주세요')).toBe(true);
  });

  it('combines recency + preamble + prompt in order', () => {
    const out = composePrompt({
      prompt: 'q',
      preamble: 'My preamble',
      recencyLevel: 'normal',
      today: FIXED_TODAY,
    });
    const idxPolicy = out.indexOf('<recency_policy>');
    const idxPreamble = out.indexOf('My preamble');
    const idxPrompt = out.indexOf('\n\nq');
    expect(idxPolicy).toBeLessThan(idxPreamble);
    expect(idxPreamble).toBeLessThan(idxPrompt);
  });

  it('defaults today to local YYYY-MM-DD when not provided', () => {
    const out = composePrompt({
      prompt: 'q',
      preamble: '',
      recencyLevel: 'normal',
    });
    expect(/오늘은 \d{4}-\d{2}-\d{2}입니다/.test(out)).toBe(true);
  });
});
