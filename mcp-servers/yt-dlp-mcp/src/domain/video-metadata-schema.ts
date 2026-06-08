import { z } from 'zod';

/** Zod mirror of VideoMetadata — the shared output-schema contract for
 * metadata-bearing tools (metadata, metadata summary, transcript). */
export const videoMetadataSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  channel: z.string(),
  channelId: z.string().optional(),
  viewCount: z.number().optional(),
  likeCount: z.number().optional(),
  commentCount: z.number().optional(),
  durationSec: z.number().optional(),
  uploadDate: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  thumbnailUrl: z.string().optional(),
  webpageUrl: z.string().optional(),
  isLive: z.boolean().optional(),
});
