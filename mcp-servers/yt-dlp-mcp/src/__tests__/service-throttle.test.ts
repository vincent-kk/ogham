import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createService } from '../core/service.js';

import { makeFakeRunner } from './helpers/fake-runner.js';
import {
  type TestEnv,
  makeTestEnv,
  silentLogger,
} from './helpers/test-context.js';

const SUBTITLE_INTERVAL = 60;
const REQUEST_INTERVAL = 20;

let env: TestEnv;
beforeEach(async () => {
  env = await makeTestEnv({
    YTDLP_MAX_CONCURRENCY: '4',
    YTDLP_REQUEST_INTERVAL_MS: String(REQUEST_INTERVAL),
    YTDLP_SUBTITLE_INTERVAL_MS: String(SUBTITLE_INTERVAL),
  });
});
afterEach(async () => {
  await env.cleanup();
});

function makeService() {
  return createService({
    runner: makeFakeRunner(),
    config: env.config,
    paths: env.paths,
    logger: silentLogger,
  });
}

describe('Service throttle wiring', () => {
  it('spaces concurrent subtitle-throttled calls by the subtitle interval', async () => {
    const service = makeService();
    const starts: number[] = [];
    const fn = async (): Promise<number> => {
      starts.push(Date.now());
      return 1;
    };
    await Promise.all([
      service.execute({ cacheKey: 'transcript:a', throttle: 'subtitle' }, fn),
      service.execute({ cacheKey: 'transcript:b', throttle: 'subtitle' }, fn),
      service.execute({ cacheKey: 'transcript:c', throttle: 'subtitle' }, fn),
    ]);
    starts.sort((a, b) => a - b);
    expect(starts).toHaveLength(3);
    // Reservations are t, t+I, t+2I; allow scheduler jitter slack.
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(
      SUBTITLE_INTERVAL - 15,
    );
    expect(starts[2] - starts[0]).toBeGreaterThanOrEqual(
      SUBTITLE_INTERVAL * 2 - 15,
    );
  });

  it('uses the lighter request throttle when throttle is unspecified', async () => {
    const service = makeService();
    const starts: number[] = [];
    const fn = async (): Promise<number> => {
      starts.push(Date.now());
      return 1;
    };
    await Promise.all([
      service.execute({ cacheKey: 'metadata:a' }, fn),
      service.execute({ cacheKey: 'metadata:b' }, fn),
    ]);
    starts.sort((a, b) => a - b);
    const gap = starts[1] - starts[0];
    // Paced by the (smaller) request interval, not the subtitle interval.
    expect(gap).toBeGreaterThanOrEqual(REQUEST_INTERVAL - 10);
    expect(gap).toBeLessThan(SUBTITLE_INTERVAL);
  });

  it('selects throttle by option, independent of cacheKey prefix', async () => {
    const service = makeService();
    const starts: number[] = [];
    const fn = async (): Promise<number> => {
      starts.push(Date.now());
      return 1;
    };
    // cacheKey looks non-subtitle, but throttle:'subtitle' still applies the subtitle interval.
    await Promise.all([
      service.execute({ cacheKey: 'metadata:a', throttle: 'subtitle' }, fn),
      service.execute({ cacheKey: 'metadata:b', throttle: 'subtitle' }, fn),
    ]);
    starts.sort((a, b) => a - b);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(
      SUBTITLE_INTERVAL - 15,
    );
  });

  it('a cache hit bypasses the throttle entirely', async () => {
    const service = makeService();
    const fn = vi.fn(async () => ({ value: 7 }));
    await service.execute(
      { cacheKey: 'transcript:x', cacheable: true, throttle: 'subtitle' },
      fn,
    );
    const start = Date.now();
    const hit = await service.execute(
      { cacheKey: 'transcript:x', cacheable: true, throttle: 'subtitle' },
      fn,
    );
    const elapsed = Date.now() - start;
    expect(hit).toEqual({ value: 7 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(elapsed).toBeLessThan(SUBTITLE_INTERVAL);
  });

  it('never exceeds maxConcurrency even under a burst', async () => {
    const lowConc = await makeTestEnv({
      YTDLP_MAX_CONCURRENCY: '2',
      YTDLP_REQUEST_INTERVAL_MS: '0',
      YTDLP_SUBTITLE_INTERVAL_MS: '0',
    });
    try {
      const service = createService({
        runner: makeFakeRunner(),
        config: lowConc.config,
        paths: lowConc.paths,
        logger: silentLogger,
      });
      let active = 0;
      let peak = 0;
      const fn = async (): Promise<void> => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 15));
        active -= 1;
      };
      await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          service.execute({ cacheKey: `metadata:${i}` }, fn),
        ),
      );
      expect(peak).toBeLessThanOrEqual(2);
    } finally {
      await lowConc.cleanup();
    }
  });
});
