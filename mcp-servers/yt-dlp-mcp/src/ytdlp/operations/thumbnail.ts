import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { ErrorCode, YtDlpMcpError } from '../../domain/errors.js';
import type { ThumbnailResult } from '../../domain/types.js';
import { removeDir } from '../../paths/index.js';
import { isValidUrl } from '../../utils/validate-url.js';

import type { OpContext } from './context.js';

export interface ThumbnailParams {
  url: string;
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/**
 * Downloads the video thumbnail (converted to JPG) and stores it in the downloads
 * directory. Works in a per-call temp dir so concurrent calls never misattribute
 * each other's files, then copies the result to its final location.
 */
export async function thumbnailOperation(
  ctx: OpContext,
  params: ThumbnailParams,
): Promise<ThumbnailResult> {
  if (!isValidUrl(params.url))
    throw new YtDlpMcpError(
      ErrorCode.INVALID_INPUT,
      'Invalid or unsupported URL',
    );

  const tmpDir = await ctx.paths.makeTempDir('thumb-');
  try {
    await ctx.runner.run(
      [
        '--skip-download',
        '--write-thumbnail',
        '--convert-thumbnails',
        'jpg',
        '-o',
        path.join(tmpDir, '%(id)s.%(ext)s'),
        params.url,
      ],
      { timeoutMs: ctx.config.extraction.timeoutMs, signal: ctx.signal },
    );

    const images = (await readdir(tmpDir)).filter((f) => IMAGE_EXT.test(f));
    if (images.length === 0)
      throw new YtDlpMcpError(
        ErrorCode.DOWNLOAD_FAILED,
        'No thumbnail file was produced',
      );
    const chosen = images.find((f) => /\.jpe?g$/i.test(f)) ?? images[0];

    await mkdir(ctx.paths.downloadsDir, { recursive: true });
    const dest = path.join(ctx.paths.downloadsDir, chosen);
    await copyFile(path.join(tmpDir, chosen), dest);
    const { size } = await stat(dest);
    return { path: dest, bytes: size };
  } finally {
    await removeDir(tmpDir);
  }
}
