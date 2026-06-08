import { describe, expect, it } from 'vitest';

import {
  fileLang,
  pickSubtitleFile,
  uniqueLangs,
} from '../features/subtitle/operations/subtitle-files.js';

describe('pickSubtitleFile', () => {
  it('prefers the exact requested language', () => {
    const files = ['v.en.json3', 'v.ko.json3', 'v.ja.json3'];
    expect(pickSubtitleFile(files, 'ko')).toEqual({
      file: 'v.ko.json3',
      language: 'ko',
    });
  });

  it('falls back to <lang>-orig before en', () => {
    expect(pickSubtitleFile(['v.ko-orig.json3', 'v.en.json3'], 'ko')).toEqual({
      file: 'v.ko-orig.json3',
      language: 'ko-orig',
    });
  });

  it('falls back to en when neither exact nor -orig is present', () => {
    expect(pickSubtitleFile(['v.en.json3', 'v.fr.json3'], 'ko')).toEqual({
      file: 'v.en.json3',
      language: 'en',
    });
  });

  it('falls back to the lexicographically first file regardless of input order', () => {
    const a = pickSubtitleFile(
      ['v.zh.json3', 'v.de.json3', 'v.fr.json3'],
      'ko',
    );
    const b = pickSubtitleFile(
      ['v.fr.json3', 'v.zh.json3', 'v.de.json3'],
      'ko',
    );
    expect(a).toEqual(b);
    expect(a).toEqual({ file: 'v.de.json3', language: 'de' });
  });
});

describe('fileLang', () => {
  it('extracts the language tag from a json3 filename', () => {
    expect(fileLang('dQw4.ko-orig.json3')).toBe('ko-orig');
  });

  it('returns "unknown" for names without a language tag', () => {
    expect(fileLang('weird-name.txt')).toBe('unknown');
  });
});

describe('uniqueLangs', () => {
  it('dedupes language tags while preserving first-seen order', () => {
    expect(uniqueLangs(['v.en.json3', 'v.en.json3', 'v.ko.json3'])).toEqual([
      'en',
      'ko',
    ]);
  });
});
