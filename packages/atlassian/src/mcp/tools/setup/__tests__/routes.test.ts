import { describe, it, expect, vi, afterEach } from 'vitest';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { createRouteHandler } from '../web-server/routes.js';
import type { RouteContext } from '../web-server/routes.js';

// core/index.js의 resolveEnvironment는 handleSubmit 내부에서 동적으로 import됨
vi.mock('../../../../core/index.js', () => ({
  resolveEnvironment: vi.fn().mockReturnValue({ base_url: 'https://test.atlassian.net', is_cloud: true, hostname: 'test.atlassian.net' }),
  getApiVersion: vi.fn().mockReturnValue('3'),
  executeRequest: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

const VALID_JIRA_FORM = {
  deployment_type: 'cloud',
  jira: {
    base_url: 'https://test.atlassian.net',
    username: 'user@test.com',
    api_token: 'mytoken',
  },
};

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
        reject(new Error('주소를 가져올 수 없음'));
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

function extractSetupState(html: string): Record<string, unknown> {
  const match = html.match(/window\.__SETUP_STATE__\s*=\s*(\{[\s\S]*\});/);
  if (!match) {
    throw new Error('SETUP_STATE payload not found');
  }

  return JSON.parse(match[1]);
}

let server: Server | null = null;

afterEach(async () => {
  if (server) {
    await closeTestServer(server);
    server = null;
  }
});

describe('createRouteHandler', () => {
  // --- basic ---

  it('GET / — HTML 반환하고 __SETUP_STATE__가 치환됨', async () => {
    const ctx = makeContext();
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await fetch(baseUrl + '/');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('window.__SETUP_STATE__ = {');
    expect(text).not.toContain("'__SETUP_STATE__'");
    expect(text).toContain('<html>');
  });

  it('GET / — edit mode payload에 저장된 고급 설정과 마스킹 정보가 포함됨', async () => {
    const ctx = makeContext({
      loadConfig: vi.fn().mockResolvedValue({
        jira: [{
          base_url: 'https://test.atlassian.net',
          is_cloud: true,
          username: 'user@test.com',
          ssl_verify: false,
          timeout: 45000,
        }],
      }),
      loadCredentials: vi.fn().mockResolvedValue({
        jira: { basic: { api_token: 'secret-token' } },
      }),
    });
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await fetch(baseUrl + '/');
    expect(res.status).toBe(200);
    const text = await res.text();
    const state = extractSetupState(text);
    const jira = (state.jira as Array<Record<string, unknown>>)[0];

    expect(state.configured).toBe(true);
    expect(jira.base_url).toBe('https://test.atlassian.net');
    expect(jira.username).toBe('user@test.com');
    expect(jira.ssl_verify).toBe(false);
    expect(jira.timeout).toBe(45000);
    expect(jira.api_token).toBe(true);
  });

  it('GET / — cloud 다중 site가 있으면 모든 site가 payload에 포함됨', async () => {
    const ctx = makeContext({
      loadConfig: vi.fn().mockResolvedValue({
        jira: [
          {
            base_url: 'https://alpha.atlassian.net',
            is_cloud: true,
            username: 'user@test.com',
            ssl_verify: true,
            timeout: 30000,
          },
          {
            base_url: 'https://beta.atlassian.net',
            is_cloud: true,
            username: 'user@test.com',
            ssl_verify: true,
            timeout: 30000,
          },
        ],
        confluence: [
          {
            base_url: 'https://alpha.atlassian.net',
            is_cloud: true,
            username: 'user@test.com',
            ssl_verify: true,
            timeout: 30000,
          },
          {
            base_url: 'https://beta.atlassian.net',
            is_cloud: true,
            username: 'user@test.com',
            ssl_verify: true,
            timeout: 30000,
          },
        ],
      }),
    });
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await fetch(baseUrl + '/');
    expect(res.status).toBe(200);
    const text = await res.text();
    const state = extractSetupState(text);
    const jiraSites = state.jira as Array<Record<string, unknown>>;

    expect(jiraSites).toHaveLength(2);
    expect(jiraSites[0].base_url).toBe('https://alpha.atlassian.net');
    expect(jiraSites[1].base_url).toBe('https://beta.atlassian.net');
  });

  it("GET / — onprem Jira의 api_version_override가 edit-mode payload에 보존됨 (H1 회귀 가드)", async () => {
    const ctx = makeContext({
      loadConfig: vi.fn().mockResolvedValue({
        jira: [{
          base_url: 'https://jira.internal.com',
          is_cloud: false,
          username: 'user',
          ssl_verify: true,
          timeout: 30000,
          api_version_override: '3' as const,
        }],
      }),
      loadCredentials: vi.fn().mockResolvedValue({
        jira: { basic: { api_token: 'secret-token' } },
      }),
    });
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await fetch(baseUrl + '/');
    expect(res.status).toBe(200);
    const text = await res.text();
    const state = extractSetupState(text);
    const jira = (state.jira as Array<Record<string, unknown>>)[0];

    expect(jira.api_version_override).toBe('3');
    expect(state.deployment_type).toBe('onprem');
  });

  it('GET / — onprem Jira만 등록되어도 deployment_type이 "onprem" (M1 회귀 가드)', async () => {
    const ctx = makeContext({
      loadConfig: vi.fn().mockResolvedValue({
        jira: [{
          base_url: 'https://jira.internal.com',
          is_cloud: false,
          username: 'user',
          ssl_verify: true,
          timeout: 30000,
        }],
      }),
    });
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await fetch(baseUrl + '/');
    expect(res.status).toBe(200);
    const text = await res.text();
    const state = extractSetupState(text);

    expect(state.deployment_type).toBe('onprem');
    expect(state.confluence).toBeUndefined();
  });

  it('GET /status — config 없으면 configured:false 반환', async () => {
    const ctx = makeContext({ loadConfig: vi.fn().mockResolvedValue({}) });
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await fetch(baseUrl + '/status');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.configured).toBe(false);
  });

  it('POST /test — 유효한 데이터 → testConnection 결과 반환', async () => {
    const ctx = makeContext();
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await postJson(baseUrl + '/test', VALID_JIRA_FORM);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.results)).toBe(true);
  });

  // --- complex ---

  it('POST /submit — 연결 성공 → saveConfig와 saveCredentials 호출됨', async () => {
    const ctx = makeContext();
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await postJson(baseUrl + '/submit', VALID_JIRA_FORM);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(ctx.saveConfig).toHaveBeenCalledOnce();
    expect(ctx.saveCredentials).toHaveBeenCalledOnce();
  });

  it('POST /submit — 연결 실패 → saveConfig/saveCredentials 절대 호출되지 않음', async () => {
    const ctx = makeContext({
      testConnection: vi.fn().mockResolvedValue({
        service: 'jira',
        success: false,
        message: 'Authentication failed',
      }),
    });
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await postJson(baseUrl + '/submit', VALID_JIRA_FORM);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(ctx.saveConfig).not.toHaveBeenCalled();
    expect(ctx.saveCredentials).not.toHaveBeenCalled();
  });

  it('POST /submit — Zod 유효성 실패 → 400 with errors', async () => {
    const ctx = makeContext();
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await postJson(baseUrl + '/submit', {
      deployment_type: 'cloud',
      jira: { base_url: 'not-a-url' },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(Array.isArray(data.errors)).toBe(true);
  });

  it('POST /test — Zod 유효성 실패 → 400', async () => {
    const ctx = makeContext();
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await postJson(baseUrl + '/test', {
      deployment_type: 'cloud',
      jira: { base_url: 'bad-url' },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('POST /submit — 마스킹 값 복원 (api_token ••• → 기존 credential 복원)', async () => {
    const MASK = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
    const existingCreds = {
      jira: { basic: { api_token: 'original-secret-token' } },
    };
    const ctx = makeContext({
      loadCredentials: vi.fn().mockResolvedValue(existingCreds),
    });
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await postJson(baseUrl + '/submit', {
      deployment_type: 'cloud',
      jira: {
        base_url: 'https://test.atlassian.net',
        username: 'user@test.com',
        api_token: MASK,
      },
    });

    expect(res.status).toBe(200);
    const savedCreds = vi.mocked(ctx.saveCredentials).mock.calls[0]?.[0];
    expect(savedCreds?.jira?.basic?.api_token).toBe('original-secret-token');
  });

  it('GET /status — config 있으면 configured:true와 서비스 상세 반환', async () => {
    const ctx = makeContext({
      loadConfig: vi.fn().mockResolvedValue({
        jira: [{
          base_url: 'https://test.atlassian.net',
          is_cloud: true,
          ssl_verify: true,
          timeout: 30000,
        }],
      }),
    });
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await fetch(baseUrl + '/status');
    const data = await res.json();
    expect(data.configured).toBe(true);
    expect(data.jira?.[0]?.base_url).toBe('https://test.atlassian.net');
  });

  it('POST /submit 성공 — closeServer 호출됨', async () => {
    const ctx = makeContext();
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    await postJson(baseUrl + '/submit', VALID_JIRA_FORM);

    // closeServer는 void로 호출되므로 잠시 대기
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(ctx.closeServer).toHaveBeenCalled();
  });

  it('알 수 없는 라우트 — 404 반환', async () => {
    const ctx = makeContext();
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await fetch(baseUrl + '/nonexistent-path');
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('POST /submit — config가 배열로 저장됨', async () => {
    const ctx = makeContext();
    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    await postJson(baseUrl + '/submit', VALID_JIRA_FORM);

    const savedConfig = vi.mocked(ctx.saveConfig).mock.calls[0]?.[0];
    expect(Array.isArray(savedConfig?.jira)).toBe(true);
    expect(savedConfig?.jira?.[0]?.base_url).toBe('https://test.atlassian.net');
  });

  it("POST /submit — on-prem Jira api_version_override:'3'가 ServiceConfig에 저장됨", async () => {
    const ctx = makeContext();
    vi.mocked(await import('../../../../core/index.js')).resolveEnvironment.mockReturnValue({
      base_url: 'https://jira.internal.com',
      is_cloud: false,
      hostname: 'jira.internal.com',
    });

    const { server: s, baseUrl } = await startTestServer(ctx);
    server = s;

    const res = await postJson(baseUrl + '/submit', {
      deployment_type: 'onprem',
      jira: {
        base_url: 'https://jira.internal.com',
        username: 'user',
        api_token: 'token',
        api_version_override: '3',
      },
    });

    expect(res.status).toBe(200);
    const savedConfig = vi.mocked(ctx.saveConfig).mock.calls[0]?.[0];
    expect(savedConfig?.jira?.[0]?.api_version_override).toBe('3');
  });
});
