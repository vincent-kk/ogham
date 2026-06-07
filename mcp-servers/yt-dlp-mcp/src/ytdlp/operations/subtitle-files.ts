const SUB_FILE_LANG = /\.([A-Za-z0-9-]+)\.json3$/;

/** Extracts the language tag from a `<id>.<lang>.json3` filename. */
export function fileLang(file: string): string {
  const match = file.match(SUB_FILE_LANG);
  return match ? match[1] : 'unknown';
}

/** Picks the best json3 file: exact lang, then `<lang>-orig`, then `en`, then first. */
export function pickSubtitleFile(
  files: string[],
  lang: string,
): { file: string; language: string } {
  const byLang = new Map(files.map((f) => [fileLang(f), f]));
  for (const candidate of [lang, `${lang}-orig`, 'en']) {
    const file = byLang.get(candidate);
    if (file) return { file, language: candidate };
  }
  const first = files[0];
  return { file: first, language: fileLang(first) };
}

export function uniqueLangs(files: string[]): string[] {
  return [...new Set(files.map(fileLang))];
}
