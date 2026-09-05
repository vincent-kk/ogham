/** ISO 639-1 language codes accepted as dotted locale suffixes. */
const ISO_639_1_LANGUAGE_CODES = new Set(
  'aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu'.split(
    ' ',
  ),
);

/**
 * Decide whether one dotted suffix is an allowed language or language-region tag.
 * @param suffix Filename suffix without its leading dot.
 * @returns True for an ISO 639-1 language with an optional two-letter region.
 */
function isLocaleSuffix(suffix: string): boolean {
  const match = /^([a-z]{2})(?:[-_]([a-z]{2}))?$/i.exec(suffix);
  return Boolean(
    match && ISO_639_1_LANGUAGE_CODES.has(match[1]?.toLowerCase() ?? ''),
  );
}

/**
 * Normalize one filename to the stem used for review-group adjacency.
 * @param basename Filename without its containing directories.
 * @returns Stem without its extension, test marker, or explicit locale suffix.
 */
export function resolveReviewGroupStem(basename: string): string {
  const extensionIndex = basename.lastIndexOf('.');
  let stem = extensionIndex > 0 ? basename.slice(0, extensionIndex) : basename;
  let previousStem = '';
  while (stem !== previousStem) {
    previousStem = stem;
    stem = stem.replace(/\.(?:spec|test|stories)$/i, '');
    const suffixIndex = stem.lastIndexOf('.');
    if (suffixIndex > 0 && isLocaleSuffix(stem.slice(suffixIndex + 1)))
      stem = stem.slice(0, suffixIndex);
  }
  return stem;
}
