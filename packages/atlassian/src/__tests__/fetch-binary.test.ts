import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleFetch } from '../mcp/tools/fetch/index.js';
import type { HttpClientConfig } from '../types/index.js';

// Mock node:fs/promises — vi.hoisted ensures the variable is available during mock hoisting
const { mockStat } = vi.hoisted(() => ({
  mockStat: vi.fn().mockImplementation(() => Promise.reject(new Error('ENOENT'))),
}));
vi.mock('node:fs/promises', () => ({
  stat: mockStat,
}));

// Mock executeRequest
vi.mock('../core/http-client/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../core/http-client/index.js')>();
  return {
    ...actual,
    executeRequest: vi.fn(),
  };
});

// Mock file-io
vi.mock('../lib/file-io.js', () => ({
  writeBinary: vi.fn().mockResolvedValue(undefined),
}));

// Mock validateSavePath to return resolved path (skip cwd check in test)
vi.mock('../utils/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/index.js')>();
  return {
    ...actual,
    validateSavePath: vi.fn((p: string) => {
      if (p.includes('..')) throw new Error('Invalid save path: path traversal detected');
      return `/resolved${p.startsWith('/') ? '' : '/'}${p}`;
    }),
  };
});

const config: HttpClientConfig = {
  base_url: 'https://test.atlassian.net',
  auth_header: 'Bearer test',
};

describe('fetch binary download (save_to_path)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Restore default: file not found
    mockStat.mockImplementation(() => Promise.reject(new Error('ENOENT')));
  });

  it('saves binary response to file and returns metadata', async () => {
    const { executeRequest } = await import('../core/http-client/index.js');
    const { writeBinary } = await import('../lib/file-io.js');
    const buffer = new ArrayBuffer(100);

    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: 200,
      data: { _binary: true, buffer, contentType: 'image/png' },
    });

    const result = await handleFetch({
      method: 'GET',
      endpoint: '/rest/api/3/attachment/content/123',
      save_to_path: '/tmp/download.png',
    }, config);

    expect(writeBinary).toHaveBeenCalledWith('/resolved/tmp/download.png', buffer);
    expect(result.data).toEqual({
      saved_to: '/resolved/tmp/download.png',
      size_bytes: 100,
      content_type: 'image/png',
    });
  });

  it('rejects save_to_path with path traversal', async () => {
    const { executeRequest } = await import('../core/http-client/index.js');
    const buffer = new ArrayBuffer(10);

    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: 200,
      data: { _binary: true, buffer, contentType: 'image/png' },
    });

    await expect(handleFetch({
      method: 'GET',
      endpoint: '/rest/api/3/attachment/content/123',
      save_to_path: '../../etc/passwd',
    }, config)).rejects.toThrow('path traversal');
  });

  it('passes acceptBinary=true when save_to_path provided', async () => {
    const { executeRequest } = await import('../core/http-client/index.js');

    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: 200,
      data: { some: 'json' },
    });

    await handleFetch({
      method: 'GET',
      endpoint: '/rest/api/3/issue/TEST-1',
      save_to_path: '/tmp/test.json',
    }, config);

    expect(executeRequest).toHaveBeenCalledWith(config, expect.objectContaining({
      acceptBinary: true,
    }));
  });

  it('returns cached response when file already exists', async () => {
    const { executeRequest } = await import('../core/http-client/index.js');

    mockStat.mockResolvedValueOnce({ size: 2048 });

    const result = await handleFetch({
      method: 'GET',
      endpoint: '/rest/api/3/attachment/content/456',
      save_to_path: '.temp/KAN-27_comment-10110/image.png',
    }, config);

    expect(executeRequest).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      status: 200,
      data: {
        saved_to: '/resolved/.temp/KAN-27_comment-10110/image.png',
        size_bytes: 2048,
        cached: true,
      },
    });
  });

  it('downloads normally when force is true even if file exists', async () => {
    const { executeRequest } = await import('../core/http-client/index.js');
    const buffer = new ArrayBuffer(64);

    mockStat.mockResolvedValueOnce({ size: 2048 });
    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: 200,
      data: { _binary: true, buffer, contentType: 'image/png' },
    });

    const result = await handleFetch({
      method: 'GET',
      endpoint: '/rest/api/3/attachment/content/456',
      save_to_path: '.temp/KAN-27/image.png',
      force: true,
    }, config);

    expect(executeRequest).toHaveBeenCalled();
    expect((result.data as Record<string, unknown>).cached).toBeUndefined();
  });

  it('downloads when file does not exist at save_to_path', async () => {
    const { executeRequest } = await import('../core/http-client/index.js');
    const buffer = new ArrayBuffer(50);

    // mockStat already rejects by default (ENOENT)
    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: 200,
      data: { _binary: true, buffer, contentType: 'video/mp4' },
    });

    const result = await handleFetch({
      method: 'GET',
      endpoint: '/rest/api/3/attachment/content/789',
      save_to_path: '.temp/KAN-27_comment-10110/demo.mp4',
    }, config);

    expect(executeRequest).toHaveBeenCalled();
    expect(result.data).toEqual({
      saved_to: '/resolved/.temp/KAN-27_comment-10110/demo.mp4',
      size_bytes: 50,
      content_type: 'video/mp4',
    });
  });

  it('still applies ADF conversion when no save_to_path', async () => {
    const { executeRequest } = await import('../core/http-client/index.js');

    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: 200,
      data: { description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }] } },
    });

    const result = await handleFetch({
      method: 'GET',
      endpoint: '/rest/api/3/issue/TEST-1',
    }, config);

    const data = result.data as Record<string, unknown>;
    expect(data.description_markdown).toBe('hello');
  });
});
