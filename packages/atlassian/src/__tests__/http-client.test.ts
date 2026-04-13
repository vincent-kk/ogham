import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeRequest } from '../core/http-client/http-client.js';
import type { HttpClientConfig, RequestOptions } from '../core/http-client/index.js';

// Mock ssrf-guard to skip DNS resolution in tests
vi.mock('../core/http-client/ssrf-guard.js', () => ({
  validateUrl: vi.fn().mockResolvedValue(undefined),
  isPrivateIp: vi.fn().mockReturnValue(false),
}));

const mockConfig: HttpClientConfig = {
  base_url: 'https://test.atlassian.net',
  auth_header: 'Basic dGVzdDp0b2tlbg==',
  timeout: 5000,
};

describe('http-client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes a successful GET request', async () => {
    const mockResponse = new Response(JSON.stringify({ id: '123', key: 'TEST-1' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const options: RequestOptions = { method: 'GET', endpoint: '/rest/api/3/issue/TEST-1' };
    const result = await executeRequest(mockConfig, options);

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ id: '123', key: 'TEST-1' });
  });

  it('injects auth header from config', async () => {
    const mockResponse = new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    await executeRequest(mockConfig, { method: 'GET', endpoint: '/test' });

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Basic dGVzdDp0b2tlbg==');
  });

  it('returns error response for 404', async () => {
    const mockResponse = new Response(JSON.stringify({ message: 'Not found' }), {
      status: 404,
      statusText: 'Not Found',
      headers: { 'content-type': 'application/json' },
    });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const result = await executeRequest(mockConfig, { method: 'GET', endpoint: '/missing' });

    expect(result.success).toBe(false);
    expect(result.status).toBe(404);
    expect(result.error?.code).toBe('NOT_FOUND');
    expect(result.error?.retryable).toBe(false);
  });

  it('returns reauth_required for 401', async () => {
    const mockResponse = new Response('Unauthorized', {
      status: 401,
      statusText: 'Unauthorized',
    });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const result = await executeRequest(mockConfig, { method: 'GET', endpoint: '/test' });

    expect(result.error?.code).toBe('UNAUTHORIZED');
    expect(result.error?.reauth_required).toBe(true);
  });

  it('retries on 429 with backoff', async () => {
    const rateLimited = new Response('', { status: 429, statusText: 'Too Many Requests' });
    const success = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    vi.mocked(fetch)
      .mockResolvedValueOnce(rateLimited)
      .mockResolvedValueOnce(success);

    const result = await executeRequest(mockConfig, { method: 'GET', endpoint: '/test' });

    expect(result.success).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 server error', async () => {
    const serverError = new Response('', { status: 500, statusText: 'Internal Server Error' });
    const success = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    vi.mocked(fetch)
      .mockResolvedValueOnce(serverError)
      .mockResolvedValueOnce(success);

    const result = await executeRequest(mockConfig, { method: 'GET', endpoint: '/test' });

    expect(result.success).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('sends JSON body for POST requests', async () => {
    const mockResponse = new Response(JSON.stringify({ id: '456' }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const body = { fields: { summary: 'Test issue' } };
    await executeRequest(mockConfig, { method: 'POST', endpoint: '/rest/api/3/issue', body });

    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect((callArgs[1] as RequestInit).body).toBe(JSON.stringify(body));
  });

  it('handles 204 No Content response', async () => {
    const mockResponse = new Response(null, { status: 204 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const result = await executeRequest(mockConfig, { method: 'DELETE', endpoint: '/rest/api/3/issue/TEST-1' });

    expect(result.success).toBe(true);
    expect(result.status).toBe(204);
    expect(result.data).toBeNull();
  });

  it('handles network errors', async () => {
    // All retry attempts fail immediately with network error
    vi.mocked(fetch).mockRejectedValue(new Error('Network connection failed'));

    // Use short-timeout config to avoid test timeout from retry delays
    const fastConfig = { ...mockConfig, timeout: 100 };
    const result = await executeRequest(fastConfig, { method: 'GET', endpoint: '/test' });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NETWORK_ERROR');
  }, 30000);
});
