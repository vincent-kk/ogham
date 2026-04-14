import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../core/config-manager/index.js', () => ({
  loadConfig: vi.fn(),
}));
vi.mock('../../../../core/auth-manager/index.js', () => ({
  loadCredentials: vi.fn(),
}));
vi.mock('../../../../core/index.js', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return { ...original, testConnection: vi.fn() };
});

import { handleAuthCheck } from '../auth-check.js';
import { loadConfig } from '../../../../core/config-manager/index.js';
import { loadCredentials } from '../../../../core/auth-manager/index.js';
import { testConnection } from '../../../../core/index.js';

const mockLoadConfig = vi.mocked(loadConfig);
const mockLoadCredentials = vi.mocked(loadCredentials);
const mockTestConnection = vi.mocked(testConnection);

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadCredentials.mockResolvedValue({});
});

describe('handleAuthCheck', () => {
  // --- basic ---

  it('설정 없음 — authenticated:false, services:{} 반환', async () => {
    mockLoadConfig.mockResolvedValue({});

    const result = await handleAuthCheck({});

    expect(result.authenticated).toBe(false);
    expect(result.services).toEqual({});
  });

  it('Jira만 설정, connection_test:false — connection/user 필드 없이 서비스 정보 반환', async () => {
    mockLoadConfig.mockResolvedValue({
      jira: {
        base_url: 'https://test.atlassian.net',
        auth_type: 'basic',
        username: 'user@test.com',
        is_cloud: true,
        ssl_verify: true,
        timeout: 30000,
      },
    });

    const result = await handleAuthCheck({ connection_test: false });

    expect(result.authenticated).toBe(true);
    expect(result.services.jira).toEqual({
      configured: true,
      base_url: 'https://test.atlassian.net',
      auth_type: 'basic',
    });
    expect(result.services.jira).not.toHaveProperty('connection');
    expect(result.services.jira).not.toHaveProperty('user');
    expect(result.services.confluence).toBeUndefined();
  });

  it('Jira + Confluence 설정, connection_test:false — 두 서비스 모두 반환', async () => {
    mockLoadConfig.mockResolvedValue({
      jira: {
        base_url: 'https://jira.atlassian.net',
        auth_type: 'basic',
        is_cloud: true,
        ssl_verify: true,
        timeout: 30000,
      },
      confluence: {
        base_url: 'https://confluence.atlassian.net',
        auth_type: 'pat',
        is_cloud: true,
        ssl_verify: true,
        timeout: 30000,
      },
    });

    const result = await handleAuthCheck({ connection_test: false });

    expect(result.authenticated).toBe(true);
    expect(result.services.jira).toMatchObject({ configured: true, base_url: 'https://jira.atlassian.net' });
    expect(result.services.confluence).toMatchObject({ configured: true, base_url: 'https://confluence.atlassian.net' });
  });

  // --- complex ---

  it('Jira 연결 테스트 성공 — user.displayName/emailAddress 포함', async () => {
    mockLoadConfig.mockResolvedValue({
      jira: {
        base_url: 'https://test.atlassian.net',
        auth_type: 'basic',
        username: 'user@test.com',
        is_cloud: true,
        ssl_verify: true,
        timeout: 30000,
      },
    });
    mockLoadCredentials.mockResolvedValue({ jira: { basic: { api_token: 'secret' } } });
    mockTestConnection.mockResolvedValue({
      service: 'jira',
      success: true,
      message: 'OK',
      latency_ms: 120,
      response_body: { displayName: 'Test User', emailAddress: 'test@example.com' },
    });

    const result = await handleAuthCheck({ connection_test: true });

    expect(result.services.jira?.connection?.success).toBe(true);
    expect(result.services.jira?.user).toEqual({
      displayName: 'Test User',
      emailAddress: 'test@example.com',
    });
  });

  it('Confluence 연결 테스트 성공 — user는 null', async () => {
    mockLoadConfig.mockResolvedValue({
      confluence: {
        base_url: 'https://test.atlassian.net',
        auth_type: 'basic',
        username: 'user@test.com',
        is_cloud: true,
        ssl_verify: true,
        timeout: 30000,
      },
    });
    mockLoadCredentials.mockResolvedValue({ confluence: { basic: { api_token: 'secret' } } });
    mockTestConnection.mockResolvedValue({
      service: 'confluence',
      success: true,
      message: 'OK',
      latency_ms: 80,
    });

    const result = await handleAuthCheck({ connection_test: true });

    expect(result.services.confluence?.connection?.success).toBe(true);
    expect(result.services.confluence?.user).toBeNull();
  });

  it('연결 테스트 실패 — connection.success:false, user:null', async () => {
    mockLoadConfig.mockResolvedValue({
      jira: {
        base_url: 'https://test.atlassian.net',
        auth_type: 'basic',
        is_cloud: true,
        ssl_verify: true,
        timeout: 30000,
      },
    });
    mockTestConnection.mockResolvedValue({
      service: 'jira',
      success: false,
      message: 'Auth failed',
    });

    const result = await handleAuthCheck({ connection_test: true });

    expect(result.services.jira?.connection?.success).toBe(false);
    expect(result.services.jira?.connection?.message).toBe('Auth failed');
    expect(result.services.jira?.user).toBeNull();
  });

  it('자격 증명 없음 — testConnection이 빈 credentials로 호출됨', async () => {
    mockLoadConfig.mockResolvedValue({
      jira: {
        base_url: 'https://test.atlassian.net',
        auth_type: 'basic',
        is_cloud: true,
        ssl_verify: true,
        timeout: 30000,
      },
    });
    mockLoadCredentials.mockResolvedValue({});
    mockTestConnection.mockResolvedValue({
      service: 'jira',
      success: false,
      message: 'No credentials',
    });

    await handleAuthCheck({ connection_test: true });

    expect(mockTestConnection).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: {} }),
    );
  });

  it('자격 증명 안전성 — 응답에 api_token/password/personal_token 값 노출 없음', async () => {
    mockLoadConfig.mockResolvedValue({
      jira: {
        base_url: 'https://test.atlassian.net',
        auth_type: 'basic',
        is_cloud: true,
        ssl_verify: true,
        timeout: 30000,
      },
    });
    mockLoadCredentials.mockResolvedValue({
      jira: { basic: { api_token: 'super-secret-token', password: 'my-password' } },
    });
    mockTestConnection.mockResolvedValue({
      service: 'jira',
      success: true,
      message: 'OK',
    });

    const result = await handleAuthCheck({ connection_test: true });
    const json = JSON.stringify(result);

    expect(json).not.toContain('super-secret-token');
    expect(json).not.toContain('my-password');
  });

  it('connection_test 기본값 false — testConnection 호출 안 됨', async () => {
    mockLoadConfig.mockResolvedValue({
      jira: {
        base_url: 'https://test.atlassian.net',
        auth_type: 'basic',
        is_cloud: true,
        ssl_verify: true,
        timeout: 30000,
      },
    });

    await handleAuthCheck({});

    expect(mockTestConnection).not.toHaveBeenCalled();
  });

  it('Jira response_body에 displayName 없음 — user.displayName은 undefined', async () => {
    mockLoadConfig.mockResolvedValue({
      jira: {
        base_url: 'https://test.atlassian.net',
        auth_type: 'basic',
        is_cloud: true,
        ssl_verify: true,
        timeout: 30000,
      },
    });
    mockTestConnection.mockResolvedValue({
      service: 'jira',
      success: true,
      message: 'OK',
      response_body: { emailAddress: 'only@email.com' },
    });

    const result = await handleAuthCheck({ connection_test: true });

    expect(result.services.jira?.user?.displayName).toBeUndefined();
    expect(result.services.jira?.user?.emailAddress).toBe('only@email.com');
  });
});
