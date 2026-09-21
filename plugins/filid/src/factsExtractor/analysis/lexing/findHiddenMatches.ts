import type { UntrustedText } from './findUntrustedText.js';

/** A pattern match that starts inside untrusted literal content. */
export interface HiddenMatch {
  /** Offset of the match in the source. */
  offset: number;
  /** Named groups of the match. */
  groups: Record<string, string> | undefined;
  /** Whether the match sits in an unterminated template rather than on a mispaired line. */
  template: boolean;
}

/**
 * Find raw-text matches of `pattern` in untrusted text.
 *
 * The text is matched as written, never re-scanned: re-scanning it would read
 * its regex-like, comment-like and URL-like fragments as code and mispair
 * again. Each untrusted line and template is matched once. Every match inside
 * an unterminated template counts.
 * @param source - Text the untrusted ranges index into
 * @param untrusted - Result of `findUntrustedText` for `source`
 * @param pattern - Pattern to look for; the `g` flag is added when missing
 * @param scope - On an untrusted line, `afterFirstQuote` keeps any match after
 * the line's first quote — the scanner's code there may be string content —
 * while `literals` keeps only matches starting inside literal content
 * @returns Matches in source order per line, then per template
 */
export function findHiddenMatches(
  source: string,
  untrusted: UntrustedText,
  pattern: RegExp,
  scope: 'literals' | 'afterFirstQuote' = 'literals',
): HiddenMatch[] {
  const global = pattern.global
    ? pattern
    : new RegExp(pattern.source, `${pattern.flags}g`);
  const hits: HiddenMatch[] = [];
  for (const line of untrusted.lines) {
    let literalIndex = 0;
    for (const match of source.slice(line.start, line.end).matchAll(global)) {
      const offset = line.start + match.index;
      while (
        literalIndex < line.literals.length &&
        line.literals[literalIndex].end <= offset
      )
        literalIndex += 1;
      const literal = line.literals[literalIndex];
      const first = line.literals[0];
      const kept =
        scope === 'afterFirstQuote'
          ? first !== undefined && offset > first.start
          : literal !== undefined && offset > literal.start;
      if (kept) hits.push({ offset, groups: match.groups, template: false });
    }
  }
  for (const template of untrusted.templates)
    for (const match of source
      .slice(template.start + 1, template.end)
      .matchAll(global))
      hits.push({
        offset: template.start + 1 + match.index,
        groups: match.groups,
        template: true,
      });
  return hits;
}
