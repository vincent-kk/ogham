import { describe, it, expect, vi, afterEach } from 'vitest';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { createRouteHandler } from '../web-server/routes.js';
import type { RouteContext } from '../web-server/routes.js';

// Tests for the deployment-type discriminated schema and on-prem PAT routing.
// Live separately from routes.test.ts to respect the 3+12 case ceiling.

vi.mock('../../../../core/index.js', () => ({
  resolveEnvironment: vi.fn().mockReturnValue({
    base_url: 'https://jira.internal.com',
    is_cloud: false,
    hostname: 'jira.internal.com',
  }),
  getApiVersion: vi.fn().mockReturnValue('2'),
  executeRequest: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

function makeContext(overrides: Partial<RouteContext> = {}): RouteContext {
  return {
    setupHtml: "<html><script>window.__SETUP_STATE__ = '__SETUP_STATE__';</script></html>",
    loadConfig: vi.fn().mockResolvedValue({}),
    saveConfig: vi.fn().mockResolvedValue(undefined),
    loadCredentials: vi.fn().mockResolvedValue({}),
    saveCredentials: vi.fn().mockResolvedValue(undefined),
    testConnection: vi.fn().mockResolvedValue({ service: 'jira', success: true, message: 'OK' }),
    resetTimer: vi.fn(),
    closeServer: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

async function startTestServer(ctx: RouteContext): Promise<{ server: Server; baseUrl: string }> {
  const handler = createRouteHandler(ctx);
  const server = createServer(handler);
  const baseUrl = await new Promise<string>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        resolve(`http://127.0.0.1:${addr.port}`);
      } else {
        reject(new Error('could not resolve test server address'));
      }
    });
    server.on('error', reject);
  });
  return { server, baseUrl };
}

function closeTestServer(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

let server: Server | null = null;

afterEach(async () => {
  if (server) {
    await closeTestServer(server);
    server = null;
  }
});

describe('routes-validation (discriminated schema + on-prem PAT routing)', () => {
  it('POST /submit — cloud deployment with missing username is rejected by schema', async () => {
    const ctx = makeContext();
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await postJson(baseUrl + '/submit', {
      deployment_type: 'cloud',
      jira: {
        base_url: 'https://test.atlassian.net',
        api_token: 'token',
      },
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(ctx.saveConfig).not.toHaveBeenCalled();
    expect(ctx.saveCredentials).not.toHaveBeenCalled();
  });

  it('POST /submit — onprem deployment with no username and an api_token writes a bearer slot', async () => {
    const ctx = makeContext();
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await postJson(baseUrl + '/submit', {
      deployment_type: 'onprem',
      jira: {
        base_url: 'https://jira.internal.com',
        api_token: 'pat-secret-token',
      },
    });

    expect(res.status).toBe(200);
    const savedCreds = vi.mocked(ctx.saveCredentials).mock.calls[0]?.[0];
    expect(savedCreds?.jira?.bearer?.token).toBe('pat-secret-token');
    expect(savedCreds?.jira?.basic).toBeUndefined();
  });
});
