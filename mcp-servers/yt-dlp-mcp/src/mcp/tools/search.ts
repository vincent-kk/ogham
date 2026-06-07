import { z } from 'zod';

import type { SearchResult } from '../../domain/types.js';
import { cacheKey } from '../../utils/cache-key.js';
import { searchOperation } from '../../ytdlp/operations/search.js';
import { handleToolExecution } from '../handle.js';
import type { ToolDefinition } from '../tool-definition.js';
import { READ_ONLY } from './annotations.js';

const inputSchema = {
  query: z.string().min(1).max(200).describe('Search keywords or phrase.'),
  maxResults: z.number().int().min(1).max(50).optional().describe('Results to return (1-50, default 10).'),
  offset: z.number().int().min(0).optional().describe('Results to skip for pagination (default 0).'),
  uploadDateFilter: z
    .enum(['hour', 'today', 'week', 'month', 'year'])
    .optional()
    .describe('Restrict to videos uploaded within this window.'),
};

const description = `Search YouTube by keyword with pagination and an optional upload-date filter.

Args: query (string); maxResults (1-50, default 10); offset (default 0); uploadDateFilter ('hour'|'today'|'week'|'month'|'year').
Returns: a ranked list (title, uploader, URL) plus structuredContent { query, count, offset, hasMore, nextOffset, items }.
Use when: discovering videos by topic or creator. Don't use when: you already have a URL (use ytdlp_get_video_metadata).`;

function render(result: SearchResult): string {
  const head = `# Search: ${result.query} — ${result.count} result(s), offset ${result.offset}`;
  const items = result.items
    .map((it, i) => `${result.offset + i + 1}. ${it.title}${it.uploader ? ` — ${it.uploader}` : ''}\n   ${it.url}`)
    .join('\n');
  const more = result.hasMore ? `\n\n(more available — next offset ${result.nextOffset})` : '';
  return `${head}\n\n${items || 'No videos found.'}${more}`;
}

export const searchVideosTool: ToolDefinition = {
  name: 'ytdlp_search_videos',
  enabledBy: 'default',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_search_videos',
      { title: 'Search videos', description, inputSchema, annotations: READ_ONLY },
      async (args, extra) =>
        handleToolExecution(
          async () => {
            const params = {
              query: args.query,
              maxResults: args.maxResults ?? 10,
              offset: args.offset ?? 0,
              uploadDateFilter: args.uploadDateFilter,
            };
            const result = await service.execute(
              { cacheKey: cacheKey('search', params.query, params), cacheable: true, signal: extra.signal },
              (ctx) => searchOperation(ctx, params),
            );
            return { text: render(result), structuredContent: { ...result } };
          },
          { errorPrefix: 'Error searching videos', characterLimit: config.extraction.characterLimit },
        ),
    );
  },
};
