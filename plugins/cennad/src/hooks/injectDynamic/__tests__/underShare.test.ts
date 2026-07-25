import { describe, expect, it } from 'vitest';

import { type RatioLane, underShare } from '../utils/underShare.js';

const lane = (
  name: string,
  count: number,
  weight: number,
  electable = true,
): RatioLane => ({ name, count, weight, electable });

describe('underShare', () => {
  it('names electable providers below their share, in points, worst first', () => {
    // counts 3/1/0 → current 75/25/0; weights 34/33/33
    expect(
      underShare([
        lane('codex', 3, 34),
        lane('antigravity', 1, 33),
        lane('claude', 0, 33),
      ]),
    ).toBe('under share: claude 33pt · antigravity 8pt');
  });

  it('never lists a provider that hooks cannot elect', () => {
    // claude is the host's own model: reserved for crosscheck, so its gap is
    // not something auto-routing could close
    expect(
      underShare([
        lane('codex', 3, 34),
        lane('antigravity', 1, 33),
        lane('claude', 0, 33, false),
      ]),
    ).toBe('under share: antigravity 8pt');
  });

  it('returns an empty string when nothing is under share', () => {
    expect(underShare([lane('codex', 2, 0), lane('antigravity', 1, 0)])).toBe(
      '',
    );
  });

  it('treats a disabled provider weight of 0 as never under share', () => {
    expect(
      underShare([
        lane('codex', 1, 30),
        lane('antigravity', 0, 70),
        lane('claude', 0, 0),
      ]),
    ).toBe('under share: antigravity 70pt');
  });

  it('reports no gap before any call has been made', () => {
    expect(underShare([lane('codex', 0, 65), lane('antigravity', 0, 35)])).toBe(
      'under share: codex 65pt · antigravity 35pt',
    );
  });
});
