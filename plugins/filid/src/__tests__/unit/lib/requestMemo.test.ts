import { describe, expect, it } from 'vitest';

import { memoizeWithinRequest } from '../../../lib/memoizeWithinRequest.js';
import { runWithRequestMemo } from '../../../lib/runWithRequestMemo.js';

const NAMESPACE = 'requestMemoTest';

/** Counts its calls and answers with the call number, so a hit is visible. */
function countingCompute(): () => number {
  let calls = 0;
  return () => {
    calls += 1;
    return calls;
  };
}

describe('request-scoped memo', () => {
  it('computes on every call when no scope is open', () => {
    const compute = countingCompute();
    expect(memoizeWithinRequest(NAMESPACE, 'k', compute)).toBe(1);
    expect(memoizeWithinRequest(NAMESPACE, 'k', compute)).toBe(2);
    expect(memoizeWithinRequest(NAMESPACE, 'k', compute)).toBe(3);
  });

  it('computes once per key inside a scope', () => {
    const compute = countingCompute();
    runWithRequestMemo(() => {
      expect(memoizeWithinRequest(NAMESPACE, 'k', compute)).toBe(1);
      expect(memoizeWithinRequest(NAMESPACE, 'k', compute)).toBe(1);
      expect(memoizeWithinRequest(NAMESPACE, 'other', compute)).toBe(2);
    });
  });

  it('keeps one key apart across namespaces', () => {
    const compute = countingCompute();
    runWithRequestMemo(() => {
      expect(memoizeWithinRequest('first', 'k', compute)).toBe(1);
      expect(memoizeWithinRequest('second', 'k', compute)).toBe(2);
      expect(memoizeWithinRequest('first', 'k', compute)).toBe(1);
    });
  });

  it('holds the store across an await inside the scope', async () => {
    const compute = countingCompute();
    await runWithRequestMemo(async () => {
      expect(memoizeWithinRequest(NAMESPACE, 'k', compute)).toBe(1);
      await Promise.resolve();
      expect(memoizeWithinRequest(NAMESPACE, 'k', compute)).toBe(1);
    });
  });

  it('gives concurrent scopes separate stores', async () => {
    const compute = countingCompute();
    const scope = async (): Promise<number> =>
      runWithRequestMemo(async () => {
        await Promise.resolve();
        return memoizeWithinRequest(NAMESPACE, 'k', compute);
      });
    // Both scopes are open at once, so neither may answer from the other.
    expect(await Promise.all([scope(), scope()])).toEqual([1, 2]);
  });

  it('shares the outer store with a nested scope', () => {
    const compute = countingCompute();
    runWithRequestMemo(() => {
      expect(memoizeWithinRequest(NAMESPACE, 'k', compute)).toBe(1);
      runWithRequestMemo(() => {
        expect(memoizeWithinRequest(NAMESPACE, 'k', compute)).toBe(1);
      });
    });
  });

  it('does not cache a compute that throws', () => {
    let attempts = 0;
    const compute = (): number => {
      attempts += 1;
      if (attempts === 1) throw new Error('first attempt fails');
      return attempts;
    };
    runWithRequestMemo(() => {
      expect(() => memoizeWithinRequest(NAMESPACE, 'k', compute)).toThrow(
        'first attempt fails',
      );
      expect(memoizeWithinRequest(NAMESPACE, 'k', compute)).toBe(2);
    });
  });

  it('drops the store when the scope closes', () => {
    const compute = countingCompute();
    runWithRequestMemo(() => {
      expect(memoizeWithinRequest(NAMESPACE, 'k', compute)).toBe(1);
    });
    runWithRequestMemo(() => {
      expect(memoizeWithinRequest(NAMESPACE, 'k', compute)).toBe(2);
    });
  });
});
