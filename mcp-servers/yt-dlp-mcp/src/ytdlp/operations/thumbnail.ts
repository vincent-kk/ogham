import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { ErrorCode, YtDlpMcpError } from '../../domain/errors.js';
import type { ThumbnailResult } from '../../domain/types.js';
import { isValidUrl } from '../../utils/validate-url.js';
import type { OpContext } from './context.js';

export interface ThumbnailParams {
  url: string;
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/** Downloads the video thumbnail (converted to JPG) into the downloads directory. */
export async function thumbnailOperation(ctx: OpContext, params: ThumbnailParams): Promise<ThumbnailResult> {
  if (!isValidUrl(params.url)) {
    throw new YtDlpMcpError(ErrorCode.INVALID_INPUT, 'Invalid or unsupported URL');
  }
  const dir = ctx.paths.downloadsDir;
  await mkdir(dir, { recursive: true });
  const before = new Set(await readdir(dir));

  await ctx.runner.run(
    [
      '--skip-download',
      '--write-thumbnail',
      '--convert-thumbnails',
      'jpg',
      '-o',
      path.join(dir, '%(id)s.%(ext)s'),
      params.url,
    ],
    { timeoutMs: ctx.config.extraction.timeoutMs, signal: ctx.signal },
  );

  const created = (await readdir(dir)).filter((f) => !before.has(f) && IMAGE_EXT.test(f));
  if (created.length === 0) {
    throw new YtDlpMcpError(ErrorCode.DOWNLOAD_FAILED, 'No thumbnail file was produced');
  }
  const file = path.join(dir, created[0]);
  const { size } = await stat(file);
  return { path: file, bytes: size };
}
