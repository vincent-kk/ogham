import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { SUB_FORMAT } from '../../constants/ytdlp.js';
import { ErrorCode, YtDlpMcpError } from '../../domain/errors.js';
import type { RawSubtitleResult } from '../../domain/types.js';
import { removeDir } from '../../paths/index.js';
import { lastNonEmptyLine } from '../../utils/last-line.js';
import { parseVideoId } from '../../utils/parse-video-id.js';
import { isValidUrl } from '../../utils/validate-url.js';

import type { OpContext } from './context.js';
import { parseJson3 } from './parse-json3.js';
import { pickSubtitleFile } from './subtitle-files.js';

export interface SubtitlesParams {
  url: string;
  language: string;
}

export async function subtitlesOperation(
  ctx: OpContext,
  params: SubtitlesParams,
): Promise<RawSubtitleResult> {
  if (!isValidUrl(params.url))
    throw new YtDlpMcpError(
      ErrorCode.INVALID_INPUT,
      'Invalid or unsupported URL',
    );
  const lang = params.language;
  const tmpDir = await ctx.paths.makeTempDir('subs-');
  try {
    const { stdout } = await ctx.runner.run(
      [
        '--skip-download',
        '--write-subs',
        '--write-auto-subs',
        '--sub-langs',
        `${lang},${lang}-orig,en`,
        '--sub-format',
        SUB_FORMAT,
        '--no-simulate',
        '--print',
        '%(id)s',
        '-o',
        path.join(tmpDir, '%(id)s.%(ext)s'),
        params.url,
      ],
      { timeoutMs: ctx.config.extraction.timeoutMs, signal: ctx.signal },
    );

    const files = (await readdir(tmpDir)).filter((f) => f.endsWith('.json3'));
    if (files.length === 0) {
      throw new YtDlpMcpError(
        ErrorCode.NO_CAPTIONS,
        `No subtitles available for language '${lang}'`,
      );
    }
    const picked = pickSubtitleFile(files, lang);
    const content = await readFile(path.join(tmpDir, picked.file), 'utf8');
    return {
      videoId:
        lastNonEmptyLine(stdout) || parseVideoId(params.url) || 'unknown',
      language: picked.language,
      format: SUB_FORMAT,
      content,
      segments: parseJson3(content),
    };
  } finally {
    await removeDir(tmpDir);
  }
}
