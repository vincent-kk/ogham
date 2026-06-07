import { z } from 'zod';

import type { SubtitleLanguageList, SubtitleTrack } from '../../domain/types.js';
import { cacheKey } from '../../utils/cache-key.js';
import { listSubtitlesOperation } from '../../ytdlp/operations/list-subtitles.js';
import { handleToolExecution } from '../handle.js';
import type { ToolDefinition } from '../tool-definition.js';
import { READ_ONLY } from './annotations.js';

const inputSchema = {
  url: z.string().describe('Full video URL.'),
};

const description = `List available subtitle/caption languages for a video (manual and auto-generated).

Args: url (string).
Returns: text listing manual + automatic languages, plus structuredContent { videoId, manual[], automatic[] }.
Use when: checking what languages exist before fetching a transcript. Don't use when: you want the text itself (use ytdlp_download_transcript).`;

function track(t: SubtitleTrack): string {
  return `${t.language}${t.name ? ` (${t.name})` : ''} [${t.ext}]`;
}

function render(result: SubtitleLanguageList): string {
  const manual = result.manual.map(track).join(', ') || 'none';
  const automatic = result.automatic.map(track).join(', ') || 'none';
  return `# Subtitles for ${result.videoId}\n\nManual: ${manual}\nAutomatic: ${automatic}`;
}

export const listSubtitleLanguagesTool: ToolDefinition = {
  name: 'ytdlp_list_subtitle_languages',
  enabledBy: 'default',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_list_subtitle_languages',
      { title: 'List subtitle languages', description, inputSchema, annotations: READ_ONLY },
      async (args, extra) =>
        handleToolExecution(
          async () => {
            const result = await service.execute(
              { cacheKey: cacheKey('list-subs', args.url), cacheable: true, signal: extra.signal },
              (ctx) => listSubtitlesOperation(ctx, { url: args.url }),
            );
            return { text: render(result), structuredContent: { ...result } };
          },
          { errorPrefix: 'Error listing subtitle languages', characterLimit: config.extraction.characterLimit },
        ),
    );
  },
};
