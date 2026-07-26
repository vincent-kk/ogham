import type { McpCliRunResult, McpCliRunner } from '@ogham/agent-artifacts/mcp';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../../../../lib/logger.js';
import { provisionUserMcpYoutube } from '../provisionUserMcp.js';

function recordingRunner(result: McpCliRunResult): {
  run: McpCliRunner;
  calls: Array<{ binary: string; args: readonly string[] }>;
} {
  const calls: Array<{ binary: string; args: readonly string[] }> = [];
  const run: McpCliRunner = async (binary, args) => {
    calls.push({ binary, args });
    return result;
  };
  return { run, calls };
}

const OK: McpCliRunResult = {
  code: 0,
  stdout: '',
  stderr: '',
  timedOut: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('provisionUserMcpYoutube', () => {
  it('runs `codex mcp add` with the language env when enabling', async () => {
    const { run, calls } = recordingRunner(OK);
    const result = await provisionUserMcpYoutube('codex', true, 'ko', run);
    expect(result).toEqual({ ok: true, action: 'added' });
    expect(calls).toEqual([
      {
        binary: 'codex',
        args: [
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
      },
    ]);
  });

  it('runs `codex mcp remove` when disabling', async () => {
    const { run, calls } = recordingRunner(OK);
    const result = await provisionUserMcpYoutube('codex', false, 'en', run);
    expect(result).toEqual({ ok: true, action: 'removed' });
    expect(calls).toEqual([
      {
        binary: 'codex',
        args: ['mcp', 'remove', 'yt-dlp-mcp'],
      },
    ]);
  });

  it('degrades to ok:false (quietly) when codex is not installed', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const missing = Object.assign(new Error('missing'), { code: 'ENOENT' });
    const { run } = recordingRunner({
      code: null,
      stdout: '',
      stderr: '',
      timedOut: false,
      spawnError: missing,
    });
    const result = await provisionUserMcpYoutube('codex', true, 'en', run);
    expect(result).toEqual({ ok: false, action: 'unchanged' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('degrades to ok:false on a non-zero exit', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const { run } = recordingRunner({
      code: 1,
      stdout: '',
      stderr: 'boom',
      timedOut: false,
    });
    const result = await provisionUserMcpYoutube('codex', true, 'en', run);
    expect(result).toEqual({ ok: false, action: 'unchanged' });
    expect(warn).toHaveBeenCalledWith('codex youtube MCP provisioning failed', {
      code: 1,
      stderr: 'boom',
    });
  });

  it('runs scoped `claude mcp add` with the language env', async () => {
    const { run, calls } = recordingRunner(OK);
    const result = await provisionUserMcpYoutube('claude', true, 'ko', run);
    expect(result).toEqual({ ok: true, action: 'added' });
    expect(calls).toEqual([
      {
        binary: 'claude',
        args: [
          'mcp',
          'add',
          '--scope',
          'user',
          'yt-dlp-mcp',
          '--env',
          'YTDLP_LANG=ko',
          '--',
          'npx',
          '-y',
          '@ogham/yt-dlp-mcp',
        ],
      },
    ]);
  });

  it('runs scoped `claude mcp remove` when disabling', async () => {
    const { run, calls } = recordingRunner(OK);
    const result = await provisionUserMcpYoutube('claude', false, 'en', run);
    expect(result).toEqual({ ok: true, action: 'removed' });
    expect(calls).toEqual([
      {
        binary: 'claude',
        args: ['mcp', 'remove', '--scope', 'user', 'yt-dlp-mcp'],
      },
    ]);
  });
});
