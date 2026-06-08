import { describe, expect, it } from 'vitest';

import { mergeExtractorArgs } from '@/ytdlp/runner/merge-extractor-args.js';

describe('mergeExtractorArgs', () => {
  it('merges player_client and lang into one youtube flag', () => {
    expect(
      mergeExtractorArgs([
        '--extractor-args',
        'youtube:player_client=ios,tv,default',
        '--dump-single-json',
        '--extractor-args',
        'youtube:lang=ko',
        'URL',
      ]),
    ).toEqual([
      '--extractor-args',
      'youtube:player_client=ios,tv,default;lang=ko',
      '--dump-single-json',
      'URL',
    ]);
  });

  it('leaves argv without extractor-args untouched', () => {
    expect(mergeExtractorArgs(['--dump-single-json', 'URL'])).toEqual([
      '--dump-single-json',
      'URL',
    ]);
  });

  it('passes a single extractor-args through unchanged', () => {
    expect(
      mergeExtractorArgs([
        '--extractor-args',
        'youtube:player_client=tv',
        'URL',
      ]),
    ).toEqual(['--extractor-args', 'youtube:player_client=tv', 'URL']);
  });

  it('merges three youtube keys (player_client + lang + comment)', () => {
    expect(
      mergeExtractorArgs([
        '--extractor-args',
        'youtube:player_client=ios',
        '--extractor-args',
        'youtube:lang=en',
        '--extractor-args',
        'youtube:comment_sort=top;max_comments=100,all',
      ]),
    ).toEqual([
      '--extractor-args',
      'youtube:player_client=ios;lang=en;comment_sort=top;max_comments=100,all',
    ]);
  });

  it('keeps distinct IE_KEYs as separate flags', () => {
    expect(
      mergeExtractorArgs([
        '--extractor-args',
        'youtube:player_client=ios',
        '--extractor-args',
        'generic:key=val',
      ]),
    ).toEqual([
      '--extractor-args',
      'youtube:player_client=ios',
      '--extractor-args',
      'generic:key=val',
    ]);
  });

  it('lets a repeated sub-key take its last value', () => {
    expect(
      mergeExtractorArgs([
        '--extractor-args',
        'youtube:player_client=web',
        '--extractor-args',
        'youtube:player_client=ios',
      ]),
    ).toEqual(['--extractor-args', 'youtube:player_client=ios']);
  });

  it('preserves non-extractor token order and inserts at the first slot', () => {
    expect(
      mergeExtractorArgs([
        '--ignore-config',
        '--extractor-args',
        'youtube:player_client=ios',
        '--proxy',
        'socks5://h:1',
        '--extractor-args',
        'youtube:lang=ko',
        'URL',
      ]),
    ).toEqual([
      '--ignore-config',
      '--extractor-args',
      'youtube:player_client=ios;lang=ko',
      '--proxy',
      'socks5://h:1',
      'URL',
    ]);
  });
});
