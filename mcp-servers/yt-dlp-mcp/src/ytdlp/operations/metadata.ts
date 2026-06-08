import { ErrorCode, YtDlpMcpError } from '@/domain/errors.js';
import type { VideoMetadata } from '@/domain/types.js';
import { isValidUrl } from '@/utils/validate-url.js';

import type { OpContext } from './context.js';
import { fetchInfoJson } from './info-json.js';
import { mapVideoMetadata } from './map-metadata.js';

export interface MetadataParams {
  url: string;
}

export async function metadataOperation(
  ctx: OpContext,
  params: MetadataParams,
): Promise<VideoMetadata> {
  if (!isValidUrl(params.url))
    throw new YtDlpMcpError(
      ErrorCode.INVALID_INPUT,
      'Invalid or unsupported URL',
    );
  const info = await fetchInfoJson(ctx, params.url);
  return mapVideoMetadata(info);
}
