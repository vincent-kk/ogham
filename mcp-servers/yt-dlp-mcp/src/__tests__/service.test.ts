import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createService } from '@/core/service.js';

import { makeFakeRunner } from './helpers/fake-runner.js';
import {
  type TestEnv,
  makeTestEnv,
  silentLogger,
} from './helpers/test-context.js';

const delay = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

let env: TestEnv;
beforeEach(async () => {
  env = await makeTestEnv({ YTDLP_MAX_CONCURRENCY: '2' });
});
afterEach(async () => {
  await env.cleanup();
});

describe('Service.execute', () => {
  it('caches cacheable results by key', async () => {
    const service = createService({
      runner: makeFakeRunner(),
      config: env.config,
      paths: env.paths,
      logger: silentLogger,
    });
    const fn = vi.fn(async () => ({ value: 42 }));
    const a = await service.execute({ cacheKey: 'k', cacheable: true }, fn);
    const b = await service.execute({ cacheKey: 'k', cacheable: true }, fn);
    expect(a).toEqual({ value: 42 });
    expect(b).toBe(a);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not cache when cacheable is false', async () => {
    const service = createService({
      runner: makeFakeRunner(),
      config: env.config,
      paths: env.paths,
      logger: silentLogger,
    });
    const fn = vi.fn(async () => 1);
    await service.execute({ cacheKey: 'k' }, fn);
    await service.execute({ cacheKey: 'k' }, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('caps concurrency at config.maxConcurrency', async () => {
    const service = createService({
      runner: makeFakeRunner(),
      config: env.config,
      paths: env.paths,
      logger: silentLogger,
    });
    let active = 0;
    let peak = 0;
    const fn = async (): Promise<void> => {
      active += 1;
      peak = Math.max(peak, active);
      await delay(20);
      active -= 1;
    };
    await Promise.all(Array.from({ length: 6 }, () => service.execute({}, fn)));
    expect(peak).toBeLessThanOrEqual(2);
  });
});
