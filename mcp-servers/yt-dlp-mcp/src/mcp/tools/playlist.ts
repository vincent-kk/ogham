import { z } from 'zod';

import type { PlaylistResult } from '../../domain/types.js';
import { cacheKey } from '../../utils/cache-key.js';
import { playlistOperation } from '../../ytdlp/operations/playlist.js';
import { handleToolExecution } from '../handle.js';
import type { ToolDefinition } from '../tool-definition.js';
import { READ_ONLY } from './annotations.js';

const inputSchema = {
  url: z.string().describe('Playlist or channel URL.'),
  limit: z.number().int().min(1).max(500).optional().describe('Max entries to list (default: all).'),
};

const description = `List entries of a playlist or channel (flat, no per-video download).

Args: url; limit (optional). Returns: entry list plus structuredContent { id, title, uploader, count, entries }.
Use when: enumerating a playlist/channel. Don't use when: you need one video's details (use ytdlp_get_video_metadata).`;

function render(result: PlaylistResult): string {
  const head = `# ${result.title ?? 'Playlist'} — ${result.count} item(s)`;
  const lines = result.entries.map((e, i) => `${i + 1}. ${e.title}\n   ${e.url}`);
  return `${head}\n\n${lines.join('\n') || 'No entries.'}`;
}

export const playlistTool: ToolDefinition = {
  name: 'ytdlp_get_playlist',
  enabledBy: 'playlist',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_get_playlist',
      { title: 'Get playlist', description, inputSchema, annotations: READ_ONLY },
      async (args, extra) =>
        handleToolExecution(
          async () => {
            const result = await service.execute(
              { cacheKey: cacheKey('playlist', args.url, { limit: args.limit }), cacheable: true, signal: extra.signal },
              (ctx) => playlistOperation(ctx, { url: args.url, limit: args.limit }),
            );
            return { text: render(result), structuredContent: { ...result } };
          },
          { errorPrefix: 'Error fetching playlist', characterLimit: config.extraction.characterLimit },
        ),
    );
  },
};
