import { describe, expect, it } from 'vitest';

import type { CodexMcpRunner, CodexRunResult } from '../provisionCodex.js';
import { provisionCodexYoutube } from '../provisionCodex.js';

function recordingRunner(result: CodexRunResult): {
  run: CodexMcpRunner;
  calls: string[][];
} {
  const calls: string[][] = [];
  const run: CodexMcpRunner = async (args) => {
    calls.push(args);
    return result;
  };
  return { run, calls };
}

const OK: CodexRunResult = {
  notInstalled: false,
  failed: false,
  code: 0,
  stderr: '',
};

describe('provisionCodexYoutube', () => {
  it('runs `codex mcp add` with the language env when enabling', async () => {
    const { run, calls } = recordingRunner(OK);
    const result = await provisionCodexYoutube(true, 'ko', run);
    expect(result).toEqual({ ok: true, action: 'added' });
    expect(calls).toEqual([
      [
        'mcp',
        'add',
        'yt-dlp-mcp',
        '--env',
        'YTDLP_LANG=ko',
        '--',
        'npx',
        '-y',
        '@ogham/yt-dlp-mcp',
      ],
    ]);
  });

  it('runs `codex mcp remove` when disabling', async () => {
    const { run, calls } = recordingRunner(OK);
    const result = await provisionCodexYoutube(false, 'en', run);
    expect(result).toEqual({ ok: true, action: 'removed' });
    expect(calls).toEqual([['mcp', 'remove', 'yt-dlp-mcp']]);
  });

  it('degrades to ok:false (quietly) when codex is not installed', async () => {
    const { run } = recordingRunner({
      notInstalled: true,
      failed: true,
      code: null,
      stderr: '',
    });
    const result = await provisionCodexYoutube(true, 'en', run);
    expect(result).toEqual({ ok: false, action: 'unchanged' });
  });

  it('degrades to ok:false on a non-zero exit', async () => {
    const { run } = recordingRunner({
      notInstalled: false,
      failed: true,
      code: 1,
      stderr: 'boom',
    });
    const result = await provisionCodexYoutube(true, 'en', run);
    expect(result.ok).toBe(false);
  });
});
