import { describe, it } from 'vitest';

import { containsPathToken } from '../../../../core/analysis/dependencyGraph/relevance/containsPathToken.js';

import { checkProperty } from './helpers/checkProperty.js';
import type { Random } from './helpers/createRandom.js';

/** Characters texts and names are drawn from: path openers, identifier characters, regex metacharacters, case pairs. */
const ALPHABET = [...'aAbB1_$/\'"`.-()[]{}*+?^|\\ \n'];

/** Runs per property: 5,000 short strings take well under 0.1 s. */
const RUNS = 5000;

/**
 * The spec sentence as code: a case-insensitive occurrence whose previous
 * character opens a path segment and whose next character is not an
 * identifier character or does not exist; an empty name never matches.
 * @param text Searched text.
 * @param name Name to find.
 * @returns Whether some occurrence is a path token.
 */
function referenceContainsPathToken(text: string, name: string): boolean {
  if (name === '') return false;
  const haystack = text.toLowerCase();
  const needle = name.toLowerCase();
  for (let at = 1; at + needle.length <= haystack.length; at += 1)
    if (
      haystack.startsWith(needle, at) &&
      ['/', "'", '"', '`', '.'].includes(haystack[at - 1]) &&
      !/[A-Za-z0-9_$]/.test(haystack[at + needle.length] ?? '')
    )
      return true;
  return false;
}

/**
 * A random string over the alphabet.
 * @param random Seeded source.
 * @param maxLength Longest length.
 * @returns The string.
 */
function randomString(random: Random, maxLength: number): string {
  return Array.from({ length: random.int(maxLength + 1) }, () =>
    random.pick(ALPHABET),
  ).join('');
}

describe('containsPathToken matches the spec sentence on random texts and names', () => {
  it('agrees with the reference implementation and never throws', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 12,
      generate: (random, size) => {
        const name = randomString(random, Math.min(size, 4));
        const filler = () => randomString(random, size);
        return {
          name,
          text: random.chance(0.6)
            ? `${filler()}${random.pick([...'/\'"`.a'])}${name}${filler()}`
            : filler(),
        };
      },
      check: ({ text, name }) => {
        let actual: boolean;
        try {
          actual = containsPathToken(text, name);
        } catch (error) {
          return `threw ${String(error)}`;
        }
        const expected = referenceContainsPathToken(text, name);
        return actual === expected
          ? null
          : `containsPathToken=${actual}, reference=${expected}`;
      },
    });
  });
});
