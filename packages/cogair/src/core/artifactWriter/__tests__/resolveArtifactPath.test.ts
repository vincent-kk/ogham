import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ARTIFACTS_DIR_USER } from '../../../constants/paths.js';
import { resolveArtifactPath } from '../utils/resolveArtifactPath.js';

describe('resolveArtifactPath', () => {
  it('returns <cwd>/.cogair/artifacts/<sid>-<turn>.md for project mode', () => {
    const out = resolveArtifactPath({
      location: 'project',
      cwd: '/tmp/work',
      projectHash: 'deadbeefcafe',
      sessionId: 'sid-123',
      turn: 5,
    });
    expect(out).toBe(join('/tmp/work', '.cogair', 'artifacts', 'sid-123-5.md'));
  });

  it('returns <COGAIR_HOME>/artifacts/<projectHash>/<sid>-<turn>.md for user mode', () => {
    const out = resolveArtifactPath({
      location: 'user',
      cwd: '/tmp/work',
      projectHash: 'deadbeefcafe',
      sessionId: 'sid-abc',
      turn: 1,
    });
    expect(out).toBe(join(ARTIFACTS_DIR_USER, 'deadbeefcafe', 'sid-abc-1.md'));
  });
});
