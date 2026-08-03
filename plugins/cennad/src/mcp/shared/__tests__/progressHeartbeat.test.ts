import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startProgressHeartbeat } from '../helpers/progressHeartbeat.js';

/** 어떤 간격을 쓰든 여러 번 발화하기에 충분한 창. */
const LONG_ENOUGH_MS = 20 * 60_000;

describe('startProgressHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // progressToken 없이 보낸 progress 는 호스트가 짝지을 요청이 없어 버린다.
  it('sends nothing when the host supplied no progressToken', () => {
    const sendNotification = vi.fn().mockResolvedValue(undefined);

    const stop = startProgressHeartbeat({ sendNotification });
    vi.advanceTimersByTime(LONG_ENOUGH_MS);
    stop();

    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('does nothing and does not throw when the context has no sendNotification', () => {
    const stop = startProgressHeartbeat({ _meta: { progressToken: 'p1' } });

    expect(() => {
      vi.advanceTimersByTime(LONG_ENOUGH_MS);
      stop();
    }).not.toThrow();
  });

  it('beats repeatedly with the request token and a rising progress value', () => {
    const sendNotification = vi.fn().mockResolvedValue(undefined);

    const stop = startProgressHeartbeat({
      _meta: { progressToken: 'p1' },
      sendNotification,
    });
    vi.advanceTimersByTime(LONG_ENOUGH_MS);
    stop();

    expect(sendNotification.mock.calls.length).toBeGreaterThan(1);
    const first = sendNotification.mock.calls[0][0];
    expect(first.method).toBe('notifications/progress');
    expect(first.params.progressToken).toBe('p1');
    const last =
      sendNotification.mock.calls[sendNotification.mock.calls.length - 1][0];
    expect(last.params.progress).toBeGreaterThan(first.params.progress);
  });

  it('stops beating once the returned function is called', () => {
    const sendNotification = vi.fn().mockResolvedValue(undefined);

    const stop = startProgressHeartbeat({
      _meta: { progressToken: 7 },
      sendNotification,
    });
    vi.advanceTimersByTime(LONG_ENOUGH_MS);
    const beatsBeforeStop = sendNotification.mock.calls.length;
    stop();
    vi.advanceTimersByTime(LONG_ENOUGH_MS);

    expect(sendNotification.mock.calls.length).toBe(beatsBeforeStop);
  });

  // 하트비트 전송 실패는 도구 실행을 멈출 이유가 아니다 — 본체는 계속 돈다.
  it('keeps beating after a send rejects', async () => {
    const sendNotification = vi
      .fn()
      .mockRejectedValueOnce(new Error('transport closed'))
      .mockResolvedValue(undefined);

    const stop = startProgressHeartbeat({
      _meta: { progressToken: 'p1' },
      sendNotification,
    });
    await vi.advanceTimersByTimeAsync(LONG_ENOUGH_MS);
    stop();

    expect(sendNotification.mock.calls.length).toBeGreaterThan(1);
  });
});
