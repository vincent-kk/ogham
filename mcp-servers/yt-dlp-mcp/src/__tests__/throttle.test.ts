import { describe, expect, it, vi } from 'vitest';

import { createThrottle } from '@/utils/throttle.js';

describe('createThrottle', () => {
  it('minIntervalMs <= 0 is instant (sleep never called)', async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
    const now = vi.fn(() => 0);
    const throttle = createThrottle(0, now, sleep);
    await throttle.acquire();
    await throttle.acquire();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('negative interval is also instant', async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
    const throttle = createThrottle(-100, () => 0, sleep);
    await throttle.acquire();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('first acquire on an idle throttle does not wait', async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
    const throttle = createThrottle(1000, () => 5000, sleep);
    await throttle.acquire();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('spaced calls past the interval do not wait', async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
    let clock = 0;
    const now = (): number => clock;
    const throttle = createThrottle(100, now, sleep);
    await throttle.acquire();
    clock = 1000;
    await throttle.acquire();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('a synchronous burst of N gets spaced reservations 0, I, 2I…', async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
    const now = vi.fn(() => 0);
    const interval = 250;
    const throttle = createThrottle(interval, now, sleep);
    await Promise.all(Array.from({ length: 4 }, () => throttle.acquire()));
    // First reservation is "now" → no wait; the rest queue at I, 2I, 3I.
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([
      interval,
      interval * 2,
      interval * 3,
    ]);
  });

  it('a burst of 2 only delays the second caller by one interval', async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
    const throttle = createThrottle(500, () => 0, sleep);
    await Promise.all([throttle.acquire(), throttle.acquire()]);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it('reservations chain forward when the clock has advanced past nextAllowed', async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
    let clock = 0;
    const throttle = createThrottle(100, () => clock, sleep);
    await throttle.acquire(); // reserves [0,100)
    clock = 100; // exactly at nextAllowed → no wait, reserves [100,200)
    await throttle.acquire();
    await throttle.acquire(); // burst at clock=100 → waits 100ms (to 200)
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([100]);
  });

  it('mid-window arrival waits only the remaining time', async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
    let clock = 0;
    const throttle = createThrottle(1000, () => clock, sleep);
    await throttle.acquire(); // reserves up to 1000
    clock = 400; // 600ms remain in the window
    await throttle.acquire();
    expect(sleep).toHaveBeenCalledExactlyOnceWith(600);
  });
});
