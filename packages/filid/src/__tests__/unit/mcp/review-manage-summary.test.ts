import fs from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleReviewManage } from '../../../mcp/tools/review-manage.js';

// Mock fs for file I/O
vi.mock('node:fs/promises', async () => {
  const actual =
    await vi.importActual<typeof import('node:fs/promises')>(
      'node:fs/promises',
    );
  return { ...actual, default: { ...actual, readFile: vi.fn() } };
});

const mockReadFile = fs.readFile as ReturnType<typeof vi.fn>;

const PROJECT_ROOT = '/tmp/test-project';
const BRANCH = 'feature/summary-test';

const REVIEW_REPORT = `## Review Report\n\n**Verdict**: REQUEST_CHANGES\n\nFound issues.`;
const FIX_REQUESTS = `# Fix Requests

## FIX-001: Fix naming

- **Severity**: LOW
- **Source**: structure
- **Path**: \`src/Bad.ts\`
- **Rule**: naming-convention
- **Recommended Action**: Rename to kebab-case
`;

beforeEach(() => {
  mockReadFile.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('review-manage generate-human-summary action', () => {
  it('generates summary from review session files', async () => {
    mockReadFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath !== 'string') throw new Error('not found');
      if (filePath.endsWith('review-report.md')) return REVIEW_REPORT;
      if (filePath.endsWith('fix-requests.md')) return FIX_REQUESTS;
      throw new Error('ENOENT');
    });

    const result = await handleReviewManage({
      action: 'generate-human-summary',
      projectRoot: PROJECT_ROOT,
      branchName: BRANCH,
    });

    expect(result).toHaveProperty('branch', BRANCH);
    expect(result).toHaveProperty('verdict', 'REQUEST_CHANGES');
    expect(result).toHaveProperty('markdown');
    expect(result).toHaveProperty('totalFindings');
  });

  it('throws when branchName is missing', async () => {
    await expect(
      handleReviewManage({
        action: 'generate-human-summary',
        projectRoot: PROJECT_ROOT,
      }),
    ).rejects.toThrow('branchName is required');
  });

  it('throws when projectRoot is missing', async () => {
    await expect(
      handleReviewManage({
        action: 'generate-human-summary',
        branchName: BRANCH,
      } as any),
    ).rejects.toThrow('projectRoot is required');
  });

  it('handles missing review files gracefully', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const result = await handleReviewManage({
      action: 'generate-human-summary',
      projectRoot: PROJECT_ROOT,
      branchName: BRANCH,
    });

    expect(result).toHaveProperty('verdict', 'UNKNOWN');
    expect(result).toHaveProperty('totalFindings', 0);
  });
});
