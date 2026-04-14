import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SetupServerHandle } from '../../../../types/index.js';
import { startSetupServer } from '../web-server/web-server.js';

const mockContext = {
  setupHtml: '<html>__SETUP_STATE__</html>',
  loadConfig: vi.fn().mockResolvedValue({}),
  saveConfig: vi.fn().mockResolvedValue(undefined),
  loadCredentials: vi.fn().mockResolvedValue({}),
  saveCredentials: vi.fn().mockResolvedValue(undefined),
  testConnection: vi.fn().mockResolvedValue({ service: 'jira', success: true, message: 'OK' }),
};

let handle: SetupServerHandle | null = null;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  if (handle) {
    await handle.close();
    handle = null;
  }
});

describe('startSetupServer', () => {
  // --- basic ---

  it('서버 시작 — { url, close } 반환, url은 http://127.0.0.1:포트 형식', async () => {
    handle = await startSetupServer({ context: mockContext });

    expect(handle.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(typeof handle.close).toBe('function');
  });

  it('GET / — 200 응답과 HTML 반환', async () => {
    handle = await startSetupServer({ context: mockContext });

    const res = await fetch(handle.url + '/');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<html>');
  });

  it('close() 호출 후 — fetch 실패해야 함', async () => {
    handle = await startSetupServer({ context: mockContext });
    const url = handle.url;

    await handle.close();
    handle = null;

    await expect(fetch(url + '/')).rejects.toThrow();
  });

  // --- complex ---

  it('동적 포트 — port > 0', async () => {
    handle = await startSetupServer({ context: mockContext });

    const port = parseInt(new URL(handle.url).port, 10);
    expect(port).toBeGreaterThan(0);
  });

  it('close() 멱등성 — 두 번 호출해도 에러 없음', async () => {
    handle = await startSetupServer({ context: mockContext });

    await handle.close();
    await expect(handle.close()).resolves.toBeUndefined();
    handle = null;
  });

  it('127.0.0.1 바인딩 — url에 127.0.0.1 포함', async () => {
    handle = await startSetupServer({ context: mockContext });

    expect(handle.url).toContain('127.0.0.1');
  });

  it('알 수 없는 라우트 — 404 반환', async () => {
    handle = await startSetupServer({ context: mockContext });

    const res = await fetch(handle.url + '/unknown');
    expect(res.status).toBe(404);
  });

  it('OPTIONS 요청 — 204 반환 (CORS preflight)', async () => {
    handle = await startSetupServer({ context: mockContext });

    const res = await fetch(handle.url + '/', { method: 'OPTIONS' });
    expect(res.status).toBe(204);
  });

  it('자동 종료 타이머 — setTimeout이 설정됨', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    handle = await startSetupServer({ context: mockContext });

    expect(setTimeoutSpy).toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });
});
