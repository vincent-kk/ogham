import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { ErrorCode, YtDlpMcpError } from '@/domain/errors.js';
import type { DownloadResult } from '@/domain/types.js';
import { lastNonEmptyLine } from '@/utils/last-line.js';
import { isValidUrl } from '@/utils/validate-url.js';

import type { OpContext } from './context.js';

export type Resolution = '480p' | '720p' | '1080p' | 'best';
export type AudioFormat = 'm4a' | 'mp3';

export interface DownloadParams {
  url: string;
  kind: 'video' | 'audio';
  resolution?: Resolution;
  audioFormat?: AudioFormat;
  startTime?: string;
  endTime?: string;
}

// Downloads can be large; allow more wall-clock than metadata extraction.
const DOWNLOAD_TIMEOUT_FACTOR = 10;
// Postfix the kind so a video file and an audio extraction of the same video
// don't collide on one name (audio's intermediate download shares the template).
const outputTemplate = (kind: DownloadParams['kind']): string =>
  `%(title).80B [%(id)s].${kind}.%(ext)s`;

function videoFormat(resolution: Resolution = '720p'): string {
  if (resolution === 'best') return 'bv*+ba/b';
  const height = resolution.replace('p', '');
  return `bv*[height<=${height}]+ba/b[height<=${height}]/b`;
}

export async function downloadOperation(
  ctx: OpContext,
  params: DownloadParams,
): Promise<DownloadResult> {
  if (!isValidUrl(params.url))
    throw new YtDlpMcpError(
      ErrorCode.INVALID_INPUT,
      'Invalid or unsupported URL',
    );
  await mkdir(ctx.paths.downloadsDir, { recursive: true });

  const args = [
    '--no-playlist',
    '--no-simulate',
    '-o',
    path.join(ctx.paths.downloadsDir, outputTemplate(params.kind)),
    '--print',
    'after_move:filepath',
  ];

  if (params.kind === 'audio') {
    args.push('-x', '--audio-format', params.audioFormat ?? 'm4a');
  } else {
    args.push('-f', videoFormat(params.resolution));
  }

  if (params.startTime || params.endTime) {
    args.push(
      '--download-sections',
      `*${params.startTime ?? '0'}-${params.endTime ?? 'inf'}`,
      '--force-keyframes-at-cuts',
    );
  }

  args.push(params.url);

  const { stdout } = await ctx.runner.run(args, {
    timeoutMs: ctx.config.extraction.timeoutMs * DOWNLOAD_TIMEOUT_FACTOR,
    signal: ctx.signal,
  });

  const filepath = lastNonEmptyLine(stdout);
  if (!filepath)
    throw new YtDlpMcpError(
      ErrorCode.DOWNLOAD_FAILED,
      'yt-dlp did not report an output file',
    );
  const { size } = await stat(filepath);
  return {
    path: filepath,
    bytes: size,
    format: path.extname(filepath).replace('.', '') || 'unknown',
  };
}
