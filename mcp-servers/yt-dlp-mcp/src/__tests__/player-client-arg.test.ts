import { describe, expect, it } from 'vitest';

import { loadConfig } from '@/config/index.js';
import { playerClientArg } from '@/ytdlp/runner/player-client-arg.js';

describe('playerClientArg', () => {
  it('injects the default player_client extractor arg', () => {
    expect(playerClientArg(loadConfig({}))).toEqual([
      '--extractor-args',
      'youtube:player_client=ios,tv,default',
    ]);
  });

  it('reflects an explicit YTDLP_PLAYER_CLIENT value', () => {
    expect(playerClientArg(loadConfig({ YTDLP_PLAYER_CLIENT: 'tv' }))).toEqual([
      '--extractor-args',
      'youtube:player_client=tv',
    ]);
  });

  it('is empty when disabled with a blank value', () => {
    expect(playerClientArg(loadConfig({ YTDLP_PLAYER_CLIENT: '  ' }))).toEqual(
      [],
    );
  });
});
