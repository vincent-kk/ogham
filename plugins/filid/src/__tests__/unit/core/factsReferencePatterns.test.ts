// The parity block holds the server's `FACTS_REFERENCE_LINE_PATTERNS` to the
// lines the extraction program's `HIDDEN_REFERENCE_PATTERNS` sees. The server
// copy decides which lines an attested record must explain (spec §4.6), so a
// line the extractor reads as a reference and the server does not is a
// reference nobody has to account for.
import { describe, expect, it } from 'vitest';

import {
  FACTS_REFERENCE_FALLBACK_PATTERN,
  FACTS_REFERENCE_LINE_PATTERNS,
  FACTS_SCHEMA_VERSION,
} from '../../../constants/facts.js';
import { HIDDEN_REFERENCE_PATTERNS } from '../../../factsExtractor/analysis/references/referencesInSource.js';
import { findUnaccountedLines } from '../../../core/facts/index.js';
import type { FileFacts } from '../../../core/facts/index.js';

/** Lines chosen to separate the patterns from what merely looks like them. */
const CORPUS = [
  "import x from './a.js';",
  "export { a } from './a.js';",
  "const a = await import('./a.js');",
  "import './side.js';",
  "const a = require('./a.js');",
  'importFrom("./a.js")',
  "obj.from('./a.js')",
  "// import x from './a.js';",
  'const from = 1;',
  'export const value = 1;',
  "const label = 'from here';",
] as const;

/**
 * Whether any facts line pattern flags a line.
 * @param line The line's text.
 * @returns True when the line owes an explanation under the defaults alone.
 */
function factsFlags(line: string): boolean {
  return FACTS_REFERENCE_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

/**
 * Whether any adapter hidden-reference pattern matches a line.
 * @param line The line's text.
 * @returns True when the adapter would find a raw-text reference on it.
 */
function adapterFlags(line: string): boolean {
  return HIDDEN_REFERENCE_PATTERNS.some(({ pattern }) =>
    new RegExp(pattern.source).test(line),
  );
}

/**
 * Build a minimal record carrying the given references and non-references.
 * @param references Specifiers the record claims.
 * @param nonReferences Lines the record says are not references.
 * @returns A record shaped enough for the accounting check.
 */
function record(
  references: readonly string[],
  nonReferences: readonly { line: number; reason: string }[] = [],
  resolved: FileFacts['references'][number]['resolved'] = { path: 'src/b.ts' },
): FileFacts {
  return {
    schemaVersion: FACTS_SCHEMA_VERSION,
    path: 'src/a.ts',
    contentHash: `sha256:${'0'.repeat(64)}`,
    references: references.map((specifier) => ({
      specifier,
      kind: 'static' as const,
      resolved,
    })),
    ...(nonReferences.length === 0 ? {} : { nonReferences: [...nonReferences] }),
    provenance: {
      tool: 'reader',
      version: '1',
      command: '',
      tier: 'attested' as const,
      resolutionInputs: [],
    },
  };
}

describe('the facts reference patterns against the adapter they came from', () => {
  it('flags exactly the lines the adapter finds a hidden reference on', () => {
    expect(CORPUS.map(factsFlags)).toEqual(CORPUS.map(adapterFlags));
  });

  it('carries no global flag, so a line is judged on its own', () => {
    // A global regular expression keeps lastIndex between calls, and a shared
    // constant would then skip lines depending on what came before them.
    expect(FACTS_REFERENCE_LINE_PATTERNS.some((one) => one.global)).toBe(false);
    expect(FACTS_REFERENCE_FALLBACK_PATTERN.global).toBe(false);
    const line = "import x from './a.js';";
    expect([factsFlags(line), factsFlags(line)]).toEqual([true, true]);
  });

  it('adds lines the defaults miss through the wide fallback', () => {
    // The cost is paid in the direction that cannot hide an edge: prose has to
    // be explained, a reference filid cannot recognise is never silently gone.
    expect(factsFlags('const from = 1;')).toBe(false);
    expect(FACTS_REFERENCE_FALLBACK_PATTERN.test('const from = 1;')).toBe(true);
    expect(FACTS_REFERENCE_FALLBACK_PATTERN.test('export const value = 1;')).toBe(
      false,
    );
  });
});

describe('accounting for the lines of an attested record', () => {
  it('accepts a line a reference quotes', () => {
    expect(
      findUnaccountedLines(["import x from './a.js';"], record(['./a.js'])),
    ).toEqual([]);
  });

  it('names the line numbers nothing explains', () => {
    // Numbers, not a count: a count leaves the caller guessing which line to
    // read and repeating the same refusal.
    expect(
      findUnaccountedLines(
        ['export const value = 1;', "import x from './a.js';", 'const from = 1;'],
        record([]),
      ),
    ).toEqual([2, 3]);
  });

  it('accepts a line a nonReferences entry explains', () => {
    expect(
      findUnaccountedLines(
        ["// import x from './a.js';"],
        record([], [{ line: 1, reason: 'commented out' }]),
      ),
    ).toEqual([]);
  });
});

describe('what it takes for a reference to account for a line', () => {
  it('refuses a bare specifier that is merely a substring of the line', () => {
    // `e` is in the file, so the existence check passes; letting it account for
    // every line that contains the letter would retire the whole rule with one
    // external reference.
    expect(
      findUnaccountedLines(
        ["import x from './a.js';", "const e = require('./b.js');"],
        record(['e'], [], { external: 'e' }),
      ),
    ).toEqual([1, 2]);
  });

  it('accepts a bare specifier that appears delimited on the line', () => {
    expect(
      findUnaccountedLines(
        ["import x from './a.js';", 'const t = `./a.js`;'],
        record(['./a.js']),
      ),
    ).toEqual([]);
  });

  it('accepts a specifier split across lines by a line continuation', () => {
    const facts = record([]);
    expect(
      findUnaccountedLines(["import x from './a\\", "/b.js';"], {
        ...facts,
        references: [
          {
            specifier: './a/b.js',
            sourceText: "'./a\\\n/b.js'",
            kind: 'static',
            resolved: { path: 'src/b.ts' },
          },
        ],
      }),
    ).toEqual([]);
  });

  it('accepts a sourceText exactly as the source spells it', () => {
    const facts = record([]);
    expect(
      findUnaccountedLines(["import x from '\\u002Fa.js';"], {
        ...facts,
        references: [
          {
            specifier: '/a.js',
            sourceText: "'\\u002Fa.js'",
            kind: 'static',
            resolved: { path: 'src/b.ts' },
          },
        ],
      }),
    ).toEqual([]);
  });
});
