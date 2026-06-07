import { ErrorCode, YtDlpMcpError } from '../../domain/errors.js';

import type { OpContext } from './context.js';

/** Parses a single yt-dlp `--dump-single-json` object from stdout. Pure. */
export function parseInfoJson(stdout: string): Record<string, unknown> {
  const start = stdout.indexOf('{');
  if (start === -1)
    throw new YtDlpMcpError(
      ErrorCode.UNKNOWN,
      'yt-dlp produced no JSON output',
    );
  try {
    return JSON.parse(stdout.slice(start)) as Record<string, unknown>;
  } catch (error) {
    throw new YtDlpMcpError(
      ErrorCode.UNKNOWN,
      'Failed to parse yt-dlp JSON output',
      { cause: error },
    );
  }
}

/**
 * Runs `yt-dlp --dump-single-json --skip-download [extraArgs] <target>` and
 * returns the parsed info object. Shared by metadata/chapters/heatmap/comments/
 * playlist/search operations.
 */
export async function fetchInfoJson(
  ctx: OpContext,
  target: string,
  extraArgs: string[] = [],
): Promise<Record<string, unknown>> {
  const { stdout } = await ctx.runner.run(
    ['--dump-single-json', '--skip-download', ...extraArgs, target],
    { timeoutMs: ctx.config.extraction.timeoutMs, signal: ctx.signal },
  );
  return parseInfoJson(stdout);
}
