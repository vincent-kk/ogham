import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  FACTS_ACTIONS,
  FACTS_SHARD_NOT_DAMAGED_CODE,
  FACTS_UNKNOWN_CAUSES,
} from '../../constants/facts.js';
import { resolveFactsStorePaths } from '../../core/facts/index.js';
import { MCP_TOOL_INPUT_SCHEMAS } from '../../mcp/server/lifecycle/createServer.js';
import { handleFacts } from '../../mcp/tools/facts/index.js';
import {
  cleanupFactsProjects,
  createFactsProject,
} from '../unit/mcp/facts/helpers/createFactsProject.js';

/** The canonical procedure every facts-reading skill links to. */
const CANONICAL = readFileSync(
  fileURLToPath(
    new URL('../../../skills/.shared/facts-bootstrap.md', import.meta.url),
  ),
  'utf8',
);

/** Every `action: "x"` the document tells a skill to call. */
const DOCUMENTED_ACTIONS = [
  ...new Set(
    [...CANONICAL.matchAll(/action: "([a-z-]+)"/g)].map(([, name]) => name),
  ),
];

/** The body of every `facts({ … })` call the document shows, braces balanced. */
function callBodies(): string[] {
  const bodies: string[] = [];
  const opener = 'mcp__plugin_filid_tools__facts({';
  for (
    let at = CANONICAL.indexOf(opener);
    at !== -1;
    at = CANONICAL.indexOf(opener, at + 1)
  ) {
    let depth = 0;
    let index = at + opener.length - 1;
    for (; index < CANONICAL.length; index += 1)
      if (CANONICAL[index] === '{') depth += 1;
      else if (CANONICAL[index] === '}' && (depth -= 1) === 0) break;
    bodies.push(CANONICAL.slice(at + opener.length, index));
  }
  return bodies;
}

/** Argument names the document passes in a facts call, nested values removed. */
const DOCUMENTED_ARGUMENTS = [
  ...new Set(
    callBodies().flatMap((body) =>
      body
        .replace(/\[[^\]]*\]/g, 'X')
        .replace(/\{[^}]*\}/g, 'X')
        .split(',')
        .map((part) => part.split(':')[0].trim())
        .filter((name) => /^[a-zA-Z]+$/.test(name)),
    ),
  ),
];

/** Keys the advertised facts schema accepts. */
const ADVERTISED_KEYS = new Set(
  Object.keys(
    (
      MCP_TOOL_INPUT_SCHEMAS.find(({ tool }) => tool === 'facts')
        ?.advertised as z.ZodObject<z.ZodRawShape>
    ).shape,
  ),
);

/**
 * Make the judgement shard covering `src/only.ts` unparseable.
 *
 * Damage is produced rather than described: what the status diagnostic names
 * and what `discard-damaged` will accept both come from the store's own naming.
 * @param projectRoot Absolute root of a throwaway project.
 * @returns The shard file name the diagnostic reports.
 */
function damageOneJudgementShard(projectRoot: string): string {
  const store = resolveFactsStorePaths(projectRoot);
  const shard = store.shardFileName(store.pathDigest('src/only.ts'));
  mkdirSync(store.sideTableDirectory, { recursive: true });
  writeFileSync(join(store.sideTableDirectory, shard), 'not a shard');
  return shard;
}

/** One real status response, so field positions come from the server, not from a type read by hand. */
let statusPayload: {
  summary: Record<string, unknown>;
  data: Record<string, unknown>;
};

beforeAll(async () => {
  const project = createFactsProject({
    'src/index.ts': "export { thing } from './thing.js';\n",
    'src/thing.ts': 'export const thing = 1;\n',
  });
  const result = await handleFacts({ action: 'status', path: project.root });
  statusPayload = {
    summary: { ...result.summary },
    data: { ...result.data },
  };
});
afterAll(() => cleanupFactsProjects());

/**
 * Walk one dotted reference through the status response.
 * @param reference Dotted path as the document spells it, with or without a `summary`/`data` head.
 * @returns The value found, or undefined when the path does not resolve.
 */
function resolveStatusField(reference: string): unknown {
  const parts = reference.split('.');
  const heads =
    parts[0] === 'summary' || parts[0] === 'data'
      ? [[parts[0], parts.slice(1)] as const]
      : ([
          ['summary', parts],
          ['data', parts],
        ] as const);
  for (const [head, rest] of heads) {
    let value: unknown = statusPayload[head];
    let found = true;
    for (const part of rest) {
      if (!value || typeof value !== 'object' || !(part in value)) {
        found = false;
        break;
      }
      value = (value as Record<string, unknown>)[part];
    }
    if (found) return value;
  }
  return undefined;
}

describe('the facts bootstrap document matches the tool it drives', () => {
  it('names only status fields the response actually holds, in the half it puts them', () => {
    // Step 7 reads the `discard-damaged` response, not this one; its fields
    // are checked against that payload in the damaged-shard case below.
    const statusHalf = CANONICAL.slice(0, CANONICAL.indexOf('### 7.'));
    const referenced = [
      ...new Set(
        [
          ...statusHalf.matchAll(
            /`((?:summary|data)?\.?[a-zA-Z]+(?:\.[a-zA-Z]+)+)`/g,
          ),
        ].map(([, path]) => path),
      ),
    ].filter(
      (path) => !path.startsWith('facts.') && !path.includes('resolved.'),
    );
    expect(referenced).toContain('extractionList.path');
    expect(referenced).toContain('data.unadjudicated.items');
    expect(
      referenced.filter((path) => resolveStatusField(path) === undefined),
    ).toEqual([]);
  });

  it('reads the status lists in the shape the server returns them', () => {
    for (const list of [
      'missing',
      'needsResolution',
      'uncertain',
      'toolError',
      'indeterminate',
    ])
      expect(Object.keys(statusPayload.data[list] as object).sort()).toEqual([
        'paths',
        'truncated',
      ]);
    for (const list of ['rejected', 'unadjudicated'])
      expect(Object.keys(statusPayload.data[list] as object).sort()).toEqual([
        'items',
        'truncated',
      ]);
    expect(Array.isArray(statusPayload.data.pendingAttestations)).toBe(true);
    expect(CANONICAL).toContain('`data.rejected.items`');
    expect(CANONICAL).toContain('`indeterminate`');
    expect(CANONICAL).toContain('`pendingAttestations`');
  });

  it('routes an uncertain file by the four reason lists the server splits it into', () => {
    const step = CANONICAL.slice(
      CANONICAL.indexOf('### 1.'),
      CANONICAL.indexOf('### 2.'),
    );
    for (const list of [
      'rejected',
      'unadjudicated',
      'pendingAttestations',
      'indeterminate',
    ])
      expect(step).toContain(`\`${list}\``);
    expect(step).toMatch(/response wins/i);
  });

  it('names the attested path by its real arguments and action', () => {
    const attested = CANONICAL.slice(CANONICAL.indexOf('### 6.'));
    expect(attested).toContain('attestationRequirement');
    expect(attested).toContain('actor');
    expect(attested).toContain('sourcePaths');
    expect(attested).toContain(FACTS_ACTIONS.DISCARD_PENDING);
    for (const key of ['actor', 'sourcePaths'])
      expect(ADVERTISED_KEYS.has(key)).toBe(true);
  });

  it('documents every action the tool has, except the ones it deliberately leaves out', () => {
    // Each exclusion is named with why it is one, so the list cannot quietly
    // grow into "whatever the document has not caught up with".
    const excluded = {
      [FACTS_ACTIONS.COMPARE]: 'belongs to a verifier, not the bootstrap',
    };

    expect(
      Object.values(FACTS_ACTIONS).filter(
        (action) => !DOCUMENTED_ACTIONS.includes(action),
      ),
    ).toEqual(Object.keys(excluded));
    expect(CANONICAL).toMatch(/`compare` exists for a verifier/);
  });

  it('shows every key an adjudicate item needs', () => {
    const itemKeys = Object.keys(
      (
        (
          MCP_TOOL_INPUT_SCHEMAS.find(({ tool }) => tool === 'facts')
            ?.advertised as z.ZodObject<z.ZodRawShape>
        ).shape.items as z.ZodOptional<z.ZodArray<z.ZodObject<z.ZodRawShape>>>
      ).unwrap().element.shape,
    );
    const shown = CANONICAL.slice(CANONICAL.indexOf('### 5.'));
    for (const key of itemKeys) expect(shown).toContain(key);
    expect(shown).toContain('decision: "adopt"');
  });

  it('calls the facts tool by its full name and only through real actions', () => {
    expect(CANONICAL).toContain('mcp__plugin_filid_tools__facts');
    expect(DOCUMENTED_ACTIONS.length).toBeGreaterThan(0);
    expect(
      DOCUMENTED_ACTIONS.filter(
        (action) => !Object.values(FACTS_ACTIONS).includes(action as 'status'),
      ),
    ).toEqual([]);
  });

  it('passes only arguments the advertised schema accepts', () => {
    expect(DOCUMENTED_ARGUMENTS.length).toBeGreaterThan(0);
    expect(
      DOCUMENTED_ARGUMENTS.filter((name) => !ADVERTISED_KEYS.has(name)),
    ).toEqual([]);
  });

  it('reads status fields the status payload actually carries', () => {
    const documented = [
      ...new Set(
        [
          ...CANONICAL.matchAll(
            /`(extractionList(?:\.[a-zA-Z]+)?|scopeSource|resolutionEpoch|projectState|unadjudicated|data\.unadjudicated\.items)`/g,
          ),
        ].map(([, field]) => field),
      ),
    ];
    expect(documented).toContain('scopeSource');
    expect(documented).toContain('extractionList.path');
    expect(documented).toContain('extractionList.unrepresentable');
    expect(documented).toContain('data.unadjudicated.items');
  });

  it('routes a damaged judgement shard the way the tool answers it', async () => {
    const project = createFactsProject({ 'src/only.ts': 'export const a = 1;\n' });
    const shard = damageOneJudgementShard(project.root);

    const reported = await handleFacts({ action: 'status', path: project.root });
    const dropped = await handleFacts({
      action: 'discard-damaged',
      path: project.root,
      shards: [shard],
    });
    const refused = await handleFacts({
      action: 'discard-damaged',
      path: project.root,
      shards: [shard],
    });

    const step = CANONICAL.slice(CANONICAL.indexOf('### 7.'));
    expect((reported.diagnostics ?? []).map(({ code }) => code)).toContain(
      FACTS_UNKNOWN_CAUSES.JUDGEMENTS_UNREADABLE,
    );
    expect(step).toContain(FACTS_UNKNOWN_CAUSES.JUDGEMENTS_UNREADABLE);
    expect(dropped.data).toMatchObject({ discarded: [shard], refused: [] });
    expect(refused.status).toBe('indeterminate');
    expect((refused.diagnostics ?? []).map(({ code }) => code)).toContain(
      FACTS_SHARD_NOT_DAMAGED_CODE,
    );
    expect(step).toContain(FACTS_SHARD_NOT_DAMAGED_CODE);
    // Every field step 7 sends the reader to belongs to this response.
    const real = new Set([
      ...Object.keys(dropped.data ?? {}).map((key) => `data.${key}`),
      ...Object.keys(dropped.summary).map((key) => `summary.${key}`),
    ]);
    const spelled = [
      ...step.matchAll(/`((?:data|summary)\.[a-zA-Z]+)`/g),
    ].map(([, path]) => path);
    expect(spelled.length).toBeGreaterThan(0);
    expect(spelled.filter((path) => !real.has(path))).toEqual([]);
  });

  it('never tells the agent to extract everything or to run git', () => {
    expect(CANONICAL).not.toContain('--all');
    expect(CANONICAL).not.toMatch(/\bgit ls-files\b/);
    expect(CANONICAL).toMatch(/never run git/i);
    expect(CANONICAL).not.toContain('action: "init"');
  });
});
