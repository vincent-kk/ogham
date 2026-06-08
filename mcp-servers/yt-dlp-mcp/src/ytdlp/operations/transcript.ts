import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  META_PRINT_FMT,
  SUBTITLE_RATE_LIMIT_ARGS,
  SUB_FORMAT,
} from '../../constants/ytdlp.js';
import { ErrorCode, YtDlpMcpError } from '../../domain/errors.js';
import type { TranscriptResult } from '../../domain/types.js';
import { removeDir } from '../../paths/index.js';
import { isValidUrl } from '../../utils/validate-url.js';

import type { OpContext } from './context.js';
import { parseJson3 } from './parse-json3.js';
import { parseMetaPrint } from './parse-meta-print.js';
import { pickSubtitleFile, uniqueLangs } from './subtitle-files.js';

export interface TranscriptParams {
  url: string;
  language: string;
}

export async function transcriptOperation(
  ctx: OpContext,
  params: TranscriptParams,
): Promise<TranscriptResult> {
  if (!isValidUrl(params.url))
    throw new YtDlpMcpError(
      ErrorCode.INVALID_INPUT,
      'Invalid or unsupported URL',
    );
  const lang = params.language;
  const tmpDir = await ctx.paths.makeTempDir('transcript-');
  try {
    const { stdout } = await ctx.runner.run(
      [
        '--skip-download',
        '--write-subs',
        '--write-auto-subs',
        '--sub-langs',
        `${lang},${lang}-orig`,
        '--sub-format',
        SUB_FORMAT,
        ...SUBTITLE_RATE_LIMIT_ARGS,
        '--no-simulate',
        '--print',
        META_PRINT_FMT,
        '-o',
        path.join(tmpDir, '%(id)s.%(ext)s'),
        params.url,
      ],
      { timeoutMs: ctx.config.extraction.timeoutMs, signal: ctx.signal },
    );

    const metadata = parseMetaPrint(stdout, params.url);
    const files = (await readdir(tmpDir)).filter((f) => f.endsWith('.json3'));
    if (files.length === 0) {
      throw new YtDlpMcpError(
        ErrorCode.NO_CAPTIONS,
        `No subtitles available for language '${lang}'`,
      );
    }

    const picked = pickSubtitleFile(files, lang);
    const content = await readFile(path.join(tmpDir, picked.file), 'utf8');
    const segments = parseJson3(content);
    if (segments.length === 0) {
      throw new YtDlpMcpError(
        ErrorCode.NO_CAPTIONS,
        'Subtitle file contained no readable text',
      );
    }

    return {
      videoId: metadata.videoId,
      language: picked.language,
      availableSubs: uniqueLangs(files),
      segments,
      metadata,
      source: 'yt-dlp',
      warnings: [],
    };
  } finally {
    await removeDir(tmpDir);
  }
}
