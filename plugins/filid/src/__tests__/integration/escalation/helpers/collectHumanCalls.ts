import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  type HumanCallKind,
  classifyHumanCall,
} from './utils/classifyHumanCall.js';
import { normalizeSentence } from './utils/normalizeSentence.js';
import { sourceLiteralSentences } from './utils/sourceLiteralSentences.js';
import { splitSentences } from './utils/splitSentences.js';

/** One sentence that hands the run to a person or stops it. */
export interface HumanCall {
  /** Package-relative POSIX path. */
  file: string;
  /** 1-based line the sentence (or its literal) starts on. */
  line: number;
  kind: HumanCallKind;
  /** Normalized sentence. */
  text: string;
  /** First 16 hex digits of the sha256 of `text`. */
  hash: string;
}

/**
 * Scanned trees. `src`, `hooks` and `scripts` contribute only source-file
 * literals — their module documents are contracts, not prompt text; `skills`,
 * `agents` and `templates` contribute documents and scripts alike. `e2e` is
 * left out: its text drives fixtures and assertions, never a running agent, so
 * a sentence there hands nothing to a person.
 */
const SCANNED = [
  { directory: 'src', source: true },
  { directory: 'hooks', source: true },
  { directory: 'scripts', source: true },
  { directory: 'skills', source: false },
  { directory: 'agents', source: false },
  { directory: 'templates', source: false },
];

/** A matched sentence shorter than this (`Stop.`) is recorded as its whole line, which says what stops. */
const SHORT_SENTENCE_WORDS = 3;

/**
 * Every file below a directory, tests excluded; empty when it does not exist.
 * @param directory Absolute directory.
 * @returns Absolute file paths, sorted.
 */
function listFiles(directory: string): string[] {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true, recursive: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((path) => !/[\\/]__tests__[\\/]/.test(path))
    .sort();
}

/**
 * Collect the human calls a package ships.
 *
 * Source files (`.ts`, `.mjs`, `.js`, `.d.ts` excluded) contribute the
 * sentences of their string and template literals; Markdown files under
 * `skills` and `agents` contribute their lines' sentences. Each sentence is classified by `classifyHumanCall`.
 * @param packageRoot Absolute plugin package root.
 * @returns Calls sorted by file, then line, then text.
 */
export function collectHumanCalls(packageRoot: string): HumanCall[] {
  const calls: HumanCall[] = [];
  for (const { directory, source } of SCANNED)
    for (const path of listFiles(join(packageRoot, directory))) {
      const isSource = /\.(?:m?js|ts)$/.test(path) && !path.endsWith('.d.ts');
      if (!isSource && (source || !path.endsWith('.md'))) continue;
      const text = readFileSync(path, 'utf8');
      const sentences = isSource
        ? sourceLiteralSentences(text)
        : splitSentences(text, 1);
      for (const sentence of sentences) {
        const normalizedText = normalizeSentence(sentence.text);
        const kind = classifyHumanCall(normalizedText);
        if (!kind) continue;
        const normalized = normalizeSentence(
          normalizedText.split(/\s+/).length < SHORT_SENTENCE_WORDS
            ? sentence.context
            : sentence.text,
        );
        calls.push({
          file: relative(packageRoot, path).replaceAll('\\', '/'),
          line: sentence.line,
          kind,
          text: normalized,
          hash: createHash('sha256')
            .update(normalized)
            .digest('hex')
            .slice(0, 16),
        });
      }
    }
  return calls;
}
