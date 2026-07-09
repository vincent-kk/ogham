/**
 * @file metadataStoreMutex.test.ts
 * @description withVaultLock의 vaultPath별 직렬화 검증.
 */
import { describe, expect, it } from 'vitest';

import { withVaultLock } from '../../core/indexer/metadataStore/index.js';

describe('withVaultLock', () => {
  it('동일 vaultPath 호출은 직렬 실행된다', async () => {
    const vault = '/tmp/mutex-test-1';
    const order: string[] = [];

    const a = withVaultLock(vault, async () => {
      order.push('a-start');
      await new Promise((r) => setTimeout(r, 30));
      order.push('a-end');
    });
    const b = withVaultLock(vault, async () => {
      order.push('b-start');
      await new Promise((r) => setTimeout(r, 10));
      order.push('b-end');
    });

    await Promise.all([a, b]);
    expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end']);
  });

  it('서로 다른 vaultPath는 병렬 실행된다', async () => {
    const order: string[] = [];

    const a = withVaultLock('/tmp/mutex-test-2a', async () => {
      order.push('a-start');
      await new Promise((r) => setTimeout(r, 30));
      order.push('a-end');
    });
    const b = withVaultLock('/tmp/mutex-test-2b', async () => {
      order.push('b-start');
      await new Promise((r) => setTimeout(r, 10));
      order.push('b-end');
    });

    await Promise.all([a, b]);
    // 병렬 실행이라면 b-end가 a-end보다 먼저 발생
    expect(order.indexOf('b-end')).toBeLessThan(order.indexOf('a-end'));
  });

  it('이전 호출이 throw해도 다음 호출은 정상 실행된다', async () => {
    const vault = '/tmp/mutex-test-3';
    const a = withVaultLock(vault, async () => {
      throw new Error('boom');
    });
    await expect(a).rejects.toThrow('boom');

    const b = await withVaultLock(vault, async () => 'ok');
    expect(b).toBe('ok');
  });
});
