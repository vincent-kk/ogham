import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { FIELD_SEP, META_PRINT_FMT, SUB_FORMAT } from '../../constants/ytdlp.js';
import { ErrorCode, YtDlpMcpError } from '../../domain/errors.js';
import type { TranscriptResult, VideoMetadata } from '../../domain/types.js';
import { removeDir } from '../../paths.js';
import { lastNonEmptyLine } from '../../utils/last-line.js';
import { normalizeUploadDate } from '../../utils/normalize-date.js';
import { parseVideoId } from '../../utils/parse-video-id.js';
import { isValidUrl } from '../../utils/validate-url.js';
import type { OpContext } from './context.js';
import { parseJson3 } from './parse-json3.js';
import { pickSubtitleFile, uniqueLangs } from './subtitle-files.js';

export interface TranscriptParams {
  url: string;
  language: string;
}

export async function transcriptOperation(
  ctx: OpContext,
  params: TranscriptParams,
): Promise<TranscriptResult> {
  if (!isValidUrl(params.url)) {
    throw new YtDlpMcpError(ErrorCode.INVALID_INPUT, 'Invalid or unsupported URL');
  }
  const lang = params.language;
  const tmpDir = await ctx.paths.makeTempDir('transcript-');
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
      throw new YtDlpMcpError(ErrorCode.NO_CAPTIONS, `No subtitles available for language '${lang}'`);
    }

    const picked = pickSubtitleFile(files, lang);
    const content = await readFile(path.join(tmpDir, picked.file), 'utf8');
    const segments = parseJson3(content);
    if (segments.length === 0) {
      throw new YtDlpMcpError(ErrorCode.NO_CAPTIONS, 'Subtitle file contained no readable text');
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

function toInt(value: string | undefined): number | undefined {
  if (!value || value === 'NA') {
    return undefined;
  }
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseMetaPrint(stdout: string, url: string): VideoMetadata {
  const [id, title, channel, viewCount, duration, uploadDate] = lastNonEmptyLine(stdout).split(FIELD_SEP);
  return {
    videoId: (id ?? '').trim() || parseVideoId(url) || 'unknown',
    title: (title ?? '').trim() || 'unknown',
    channel: (channel ?? '').trim() || 'unknown',
    viewCount: toInt(viewCount),
    durationSec: toInt(duration),
    uploadDate: normalizeUploadDate(uploadDate),
  };
}
