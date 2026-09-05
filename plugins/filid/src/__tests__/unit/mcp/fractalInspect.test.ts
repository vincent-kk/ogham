import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FRACTAL_INSPECT_ACTIONS,
  FRACTAL_SCAN_DETAILS,
  VERIFICATION_SCAN_DETAILS,
} from '../../../constants/mcpContracts.js';
import { handleFractalInspect } from '../../../mcp/tools/fractalInspect/index.js';

const CHILD_HANDLERS = vi.hoisted(() => ({
  scan: vi.fn(),
  validate: vi.fn(),
  verification: vi.fn(),
  resolve: vi.fn(),
}));

vi.mock('../../../mcp/tools/fractalInspect/fractalScan/index.js', () => ({
  handleFractalScan: CHILD_HANDLERS.scan,
}));
vi.mock('../../../mcp/tools/fractalInspect/structureValidate/index.js', () => ({
  handleStructureValidate: CHILD_HANDLERS.validate,
}));
vi.mock('../../../mcp/tools/fractalInspect/verificationScan/index.js', () => ({
  handleVerificationScan: CHILD_HANDLERS.verification,
}));
vi.mock('../../../mcp/tools/fractalInspect/contextResolve/index.js', () => ({
  handleContextResolve: CHILD_HANDLERS.resolve,
}));

const PROJECT_ROOT = '/project';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fractal-inspect action dispatcher', () => {
  it('dispatches scan with its existing projection input', async () => {
    const payload = { summary: { totalNodes: 2 } };
    CHILD_HANDLERS.scan.mockResolvedValue(payload);

    const result = await handleFractalInspect({
      action: FRACTAL_INSPECT_ACTIONS.SCAN,
      path: PROJECT_ROOT,
      maxDepth: 4,
      detail: FRACTAL_SCAN_DETAILS.PATHS,
      nameFilter: 'feature',
    });

    expect(CHILD_HANDLERS.scan).toHaveBeenCalledWith({
      path: PROJECT_ROOT,
      maxDepth: 4,
      detail: FRACTAL_SCAN_DETAILS.PATHS,
      nameFilter: 'feature',
    });
    expect(result).toBe(payload);
  });

  it('dispatches validate with project scopes only', async () => {
    const payload = { summary: { mode: 'project' } };
    CHILD_HANDLERS.validate.mockResolvedValue(payload);

    const result = await handleFractalInspect({
      action: FRACTAL_INSPECT_ACTIONS.VALIDATE,
      path: PROJECT_ROOT,
      scopes: ['documents'],
    });

    expect(CHILD_HANDLERS.validate).toHaveBeenCalledWith({
      path: PROJECT_ROOT,
      scopes: ['documents'],
    });
    expect(result).toBe(payload);
  });

  it('dispatches verification with its existing detail input', async () => {
    const payload = { summary: { fileCount: 1 } };
    CHILD_HANDLERS.verification.mockResolvedValue(payload);

    const result = await handleFractalInspect({
      action: FRACTAL_INSPECT_ACTIONS.VERIFICATION,
      path: PROJECT_ROOT,
      filePaths: ['/project/feature.test.ts'],
      detail: VERIFICATION_SCAN_DETAILS.FILES,
    });

    expect(CHILD_HANDLERS.verification).toHaveBeenCalledWith({
      path: PROJECT_ROOT,
      filePaths: ['/project/feature.test.ts'],
      detail: VERIFICATION_SCAN_DETAILS.FILES,
    });
    expect(result).toBe(payload);
  });

  it('dispatches resolve with its ordered request batch', async () => {
    const requests = [{ targetPath: '/project/feature.ts' }];
    const payload = { summary: { requestCount: 1 } };
    CHILD_HANDLERS.resolve.mockResolvedValue(payload);

    const result = await handleFractalInspect({
      action: FRACTAL_INSPECT_ACTIONS.RESOLVE,
      path: PROJECT_ROOT,
      requests,
    });

    expect(CHILD_HANDLERS.resolve).toHaveBeenCalledWith({
      path: PROJECT_ROOT,
      requests,
    });
    expect(result).toBe(payload);
  });
});
