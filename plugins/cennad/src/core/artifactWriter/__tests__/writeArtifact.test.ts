import { chmod, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeArtifact } from '../operations/writeArtifact.js';

describe('writeArtifact', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cennad-artifact-'));
  });

  afterEach(async () => {
    await chmod(dir, 0o700).catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
  });

  it('writes a markdown file and returns the resolved path', async () => {
    const path = await writeArtifact({
      artifacts: { enabled: true, location: 'project' },
      cwd: dir,
      projectHash: 'deadbeefcafe',
      sessionId: 'sid-1',
      turn: 1,
      provider: 'codex',
      model: 'gpt-5-codex',
      createdAt: '2026-05-22T10:00:00.000Z',
      elapsedMs: 42,
      prompt: 'hi',
      response: 'hello',
    });
    expect(path).toBe(join(dir, '.cennad', 'artifacts', 'sid-1-1.md'));
    const body = await readFile(path!, 'utf8');
    expect(body).toContain('session_id: "sid-1"');
    expect(body).toContain('## Response\n\nhello');
  });

  // POSIX permission bits don't restrict directory creation on Windows, so this
  // not-writable scenario can't be reproduced there. The catch path itself is
  // platform-independent and stays covered on POSIX runners.
  it.skipIf(process.platform === 'win32')(
    'returns undefined and does not throw when the target dir is not writable',
    async () => {
      await chmod(dir, 0o500);
      const path = await writeArtifact({
        artifacts: { enabled: true, location: 'project' },
        cwd: dir,
        projectHash: 'deadbeefcafe',
        sessionId: 'sid-2',
        turn: 1,
        provider: 'gemini',
        model: 'm',
        createdAt: '2026-05-22T10:00:00.000Z',
        elapsedMs: 0,
        prompt: 'p',
        response: 'r',
      });
      expect(path).toBeUndefined();
    },
  );
});
