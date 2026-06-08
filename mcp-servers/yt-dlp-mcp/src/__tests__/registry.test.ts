import { describe, expect, it } from 'vitest';

import { loadConfig } from '@/config/index.js';
import type { EnableKey } from '@/constants/tool-defaults.js';
import { isToolEnabled } from '@/mcp/registry/index.js';
import type { ToolDefinition } from '@/mcp/tools/utils/tool-definition.js';

const fakeTool = (enabledBy: EnableKey): ToolDefinition => ({
  name: 'fake',
  enabledBy,
  register: () => undefined,
});

const gate = (
  enabledBy: EnableKey,
  env: Record<string, string> = {},
): boolean => isToolEnabled(fakeTool(enabledBy), loadConfig(env).enable);

describe('isToolEnabled', () => {
  it('registers default-on tools when nothing is set', () => {
    expect(gate('search')).toBe(true);
    expect(gate('playlist')).toBe(true);
  });

  it('hides default-off tools when nothing is set', () => {
    expect(gate('comments')).toBe(false);
    expect(gate('downloadVideo')).toBe(false);
  });

  it('YTDLP_ENABLE_ALL turns every tool on', () => {
    expect(gate('comments', { YTDLP_ENABLE_ALL: '1' })).toBe(true);
    expect(gate('downloadAudio', { YTDLP_ENABLE_ALL: '1' })).toBe(true);
  });

  it('turns a default-on tool off via its own flag', () => {
    expect(gate('search', { YTDLP_ENABLE_SEARCH: '0' })).toBe(false);
    expect(gate('playlist', { YTDLP_ENABLE_PLAYLIST: 'false' })).toBe(false);
  });

  it('turns a default-off tool on via its own flag', () => {
    expect(gate('comments', { YTDLP_ENABLE_COMMENTS: '1' })).toBe(true);
  });

  it('maps multi-word keys to SCREAMING_SNAKE env names', () => {
    expect(
      gate('listSubtitleLanguages', {
        YTDLP_ENABLE_LIST_SUBTITLE_LANGUAGES: '0',
      }),
    ).toBe(false);
  });

  it('splits download into independent video/audio flags', () => {
    const env = { YTDLP_ENABLE_DOWNLOAD_VIDEO: '1' };
    expect(gate('downloadVideo', env)).toBe(true);
    expect(gate('downloadAudio', env)).toBe(false);
  });
});
