import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin as join } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import {
  classifyProjectFacts,
  computeLineDigest,
  hashProjectFile,
  resolveFactsScope,
  resolveFactsStorePaths,
} from '../../../core/facts/index.js';
import type {
  AdjudicationItem,
  ProjectFacts,
} from '../../../core/facts/index.js';

/** Roots removed after each case. */
const roots: string[] = [];

/** The one file every case classifies. */
const FILE = 'src/index.ts';

/** Its text; the reference sits on the first line. */
const TEXT = "export { thing } from './thing.js';\nexport const value = 1;\n";

/**
 * A project holding one bound record and one side-table item.
 * @param lineDigest Digest the item claims for the lines it was judged on.
 * @returns The store contents one classification reads.
 */
function factsWithItem(lineDigest: string): ProjectFacts {
  const root = mkdtempSync(join(tmpdir(), 'filid-classify-'));
  roots.push(root);
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, FILE), TEXT, 'utf8');
  const digest = hashProjectFile(root, FILE);
  if (!digest.ok) throw new Error('the fixture file is unreadable');
  const item: AdjudicationItem = {
    path: FILE,
    kind: 'static',
    reference: './thing.js',
    resolvedPath: 'src/thing.ts',
    origin: 'missingInStore',
    state: 'unadjudicated',
    lineDigest,
    contentHash: digest.contentHash,
  };
  return {
    scope: resolveFactsScope(),
    scannedPaths: [FILE],
    scannedSet: new Set([FILE]),
    storePaths: resolveFactsStorePaths(root),
    records: new Map([
      [
        FILE,
        {
          pathDigest: 'digest',
          record: {
            schemaVersion: 1 as const,
            resolutionEpoch: 'sha256:epoch',
            rejectedClaims: [],
            facts: {
              schemaVersion: 1 as const,
              path: FILE,
              contentHash: digest.contentHash,
              references: [],
              provenance: {
                tool: 'fixture',
                version: '1',
                command: '',
                tier: 'tool' as const,
                resolutionInputs: [],
              },
            },
          },
        },
      ],
    ]),
    shards: new Map(),
    epoch: {
      resolutionEpoch: 'sha256:epoch',
      scannedPaths: [FILE],
      resolutionInputs: [],
    },
    adjudications: new Map([
      [FILE, { schemaVersion: 1 as const, path: FILE, items: [item] }],
    ]),
    damagedJudgementShards: new Map(),
    judgementsDirectoryUnreadable: false,
    pending: new Map(),
  };
}

/**
 * The project root of one built fixture.
 * @param facts Fixture the root is read back from.
 * @returns The absolute root the fixture wrote its file under.
 */
function rootOf(facts: ProjectFacts): string {
  return roots[roots.length - 1] ?? facts.scannedPaths[0];
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('a file holding a side-table item', () => {
  it('is uncertain while the item still names the lines it was judged on', () => {
    const facts = factsWithItem(
      computeLineDigest(Buffer.from(TEXT, 'utf8'), './thing.js'),
    );

    expect(classifyProjectFacts(rootOf(facts), facts).get(FILE)).toBe(
      'uncertain',
    );
  });

  it('is exact once the item has expired against the current lines', () => {
    const facts = factsWithItem('sha256:stale');

    // `adjudicate` refuses an item whose judged lines changed, so holding the
    // file uncertain for it would be a state nothing can clear (P5). `status`
    // already stops listing it; the analysis has to agree.
    expect(classifyProjectFacts(rootOf(facts), facts).get(FILE)).toBe('exact');
  });
});
