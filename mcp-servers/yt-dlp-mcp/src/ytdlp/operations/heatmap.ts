import { ErrorCode, YtDlpMcpError } from '../../domain/errors.js';
import type { Heatmap, HeatmapSpan } from '../../domain/types.js';
import { asNumber, asRecordArray, asString } from '../../utils/coerce.js';
import { parseVideoId } from '../../utils/parse-video-id.js';
import { isValidUrl } from '../../utils/validate-url.js';

import type { OpContext } from './context.js';
import { fetchInfoJson } from './info-json.js';

export interface HeatmapParams {
  url: string;
}

export async function heatmapOperation(
  ctx: OpContext,
  params: HeatmapParams,
): Promise<Heatmap> {
  if (!isValidUrl(params.url))
    throw new YtDlpMcpError(
      ErrorCode.INVALID_INPUT,
      'Invalid or unsupported URL',
    );
  const info = await fetchInfoJson(ctx, params.url);
  const spans: HeatmapSpan[] = asRecordArray(info.heatmap).map((h) => ({
    startMs: Math.max(0, Math.round((asNumber(h.start_time) ?? 0) * 1000)),
    endMs: Math.max(0, Math.round((asNumber(h.end_time) ?? 0) * 1000)),
    score: asNumber(h.value) ?? 0,
  }));
  return {
    videoId: asString(info.id) ?? parseVideoId(params.url) ?? 'unknown',
    spans,
  };
}
