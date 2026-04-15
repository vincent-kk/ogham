import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../core/index.js', () => ({
  resolveEnvironment: vi.fn(),
  getApiVersion: vi.fn(),
  executeRequest: vi.fn(),
}));
vi.mock('../../../../utils/index.js', () => ({
  buildAuthHeader: vi.fn(),
}));

import { testConnection } from '../../../../core/connection-tester/connection-tester.js';
import { resolveEnvironment, getApiVersion, executeRequest } from '../../../../core/index.js';
import { buildAuthHeader } from '../../../../utils/index.js';

const mockResolveEnvironment = vi.mocked(resolveEnvironment);
const mockGetApiVersion = vi.mocked(getApiVersion);
const mockExecuteRequest = vi.mocked(executeRequest);
const mockBuildAuthHeader = vi.mocked(buildAuthHeader);

beforeEach(() => {
  vi.clearAllMocks();
  mockBuildAuthHeader.mockReturnValue({ type: 'Bearer', value: 'token-value' });
  mockExecuteRequest.mockResolvedValue({ success: true, data: {} });
});

describe('testConnection', () => {
  // --- basic ---

  it('Jira Cloud 성공 — /rest/api/3/myself 엔드포인트 사용', async () => {
    mockResolveEnvironment.mockReturnValue({ base_url: 'https://test.atlassian.net', is_cloud: true });
    mockGetApiVersion.mockReturnValue('3');

    const result = await testConnection({
      base_url: 'https://test.atlassian.net',
      credentials: { basic: { api_token: 'token' } },
      username: 'user@test.com',
      service: 'jira',
    });

    expect(result.success).toBe(true);
    expect(result.service).toBe('jira');
    const callArgs = mockExecuteRequest.mock.calls[0];
    expect(callArgs[1].endpoint).toBe('/rest/api/3/myself');
  });

  it('Confluence Cloud 성공 — /wiki/rest/api/space?limit=1 엔드포인트 사용', async () => {
    mockResolveEnvironment.mockReturnValue({ base_url: 'https://test.atlassian.net', is_cloud: true });
    mockGetApiVersion.mockReturnValue('3');

    const result = await testConnection({
      base_url: 'https://test.atlassian.net',
      credentials: { basic: { api_token: 'token' } },
      username: 'user@test.com',
      service: 'confluence',
    });

    expect(result.success).toBe(true);
    expect(result.service).toBe('confluence');
    const callArgs = mockExecuteRequest.mock.calls[0];
    expect(callArgs[1].endpoint).toBe('/wiki/rest/api/space?limit=1');
  });

  it('자격 증명 없음 — buildAuthHeader가 null 반환하면 success:false', async () => {
    mockResolveEnvironment.mockReturnValue({ base_url: 'https://test.atlassian.net', is_cloud: true });
    mockBuildAuthHeader.mockReturnValue(null);

    const result = await testConnection({
      base_url: 'https://test.atlassian.net',
      credentials: {},
      service: 'jira',
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Invalid or missing credentials/);
    expect(mockExecuteRequest).not.toHaveBeenCalled();
  });

  // --- complex ---

  it('Jira Server — is_cloud:false이면 /rest/api/2/myself 엔드포인트 사용', async () => {
    mockResolveEnvironment.mockReturnValue({ base_url: 'https://jira.internal.com', is_cloud: false });
    mockGetApiVersion.mockReturnValue('2');

    await testConnection({
      base_url: 'https://jira.internal.com',
      credentials: { basic: { api_token: 'token' } },
      service: 'jira',
    });

    const callArgs = mockExecuteRequest.mock.calls[0];
    expect(callArgs[1].endpoint).toBe('/rest/api/2/myself');
  });

  it('Confluence Server — is_cloud:false이면 /rest/api/space?limit=1 엔드포인트 사용', async () => {
    mockResolveEnvironment.mockReturnValue({ base_url: 'https://confluence.internal.com', is_cloud: false });

    await testConnection({
      base_url: 'https://confluence.internal.com',
      credentials: { basic: { api_token: 'token' } },
      service: 'confluence',
    });

    const callArgs = mockExecuteRequest.mock.calls[0];
    expect(callArgs[1].endpoint).toBe('/rest/api/space?limit=1');
  });

  it('401 Unauthorized — "Authentication failed" 메시지 반환', async () => {
    mockResolveEnvironment.mockReturnValue({ base_url: 'https://test.atlassian.net', is_cloud: true });
    mockGetApiVersion.mockReturnValue('3');
    mockExecuteRequest.mockResolvedValue({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
    });

    const result = await testConnection({
      base_url: 'https://test.atlassian.net',
      credentials: { basic: { api_token: 'wrong' } },
      service: 'jira',
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Authentication failed/);
  });

  it('네트워크 오류 — NETWORK_ERROR 코드이면 success:false 반환', async () => {
    mockResolveEnvironment.mockReturnValue({ base_url: 'https://test.atlassian.net', is_cloud: true });
    mockGetApiVersion.mockReturnValue('3');
    mockExecuteRequest.mockResolvedValue({
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'timeout' },
    });

    const result = await testConnection({
      base_url: 'https://test.atlassian.net',
      credentials: { basic: { api_token: 'token' } },
      service: 'jira',
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('timeout');
  });

  it('지연 시간 측정 — latency_ms는 양수여야 함', async () => {
    mockResolveEnvironment.mockReturnValue({ base_url: 'https://test.atlassian.net', is_cloud: true });
    mockGetApiVersion.mockReturnValue('3');

    const result = await testConnection({
      base_url: 'https://test.atlassian.net',
      credentials: { basic: { api_token: 'token' } },
      service: 'jira',
    });

    expect(result.latency_ms).toBeTypeOf('number');
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it('buildAuthHeader가 credentials와 username으로 호출됨', async () => {
    mockResolveEnvironment.mockReturnValue({ base_url: 'https://test.atlassian.net', is_cloud: true });
    mockGetApiVersion.mockReturnValue('3');

    await testConnection({
      base_url: 'https://test.atlassian.net',
      credentials: { basic: { api_token: 'mytoken' } },
      username: 'user@test.com',
      service: 'jira',
    });

    expect(mockBuildAuthHeader).toHaveBeenCalledWith(
      { basic: { api_token: 'mytoken' } },
      'user@test.com',
    );
  });
});
