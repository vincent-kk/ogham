import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { FACTS_ADJUDICATION_STATES } from '../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import {
  readAdjudicationTable,
  readFactsStore,
  resolveFactsStorePaths,
  selectValidReferences,
} from '../../../../core/facts/index.js';
import type { AdjudicationItem } from '../../../../core/facts/index.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  FactsAdjudicateData,
  FactsAdjudicateSummary,
  FactsCompareData,
  FactsCompareSummary,
  FactsOpenItem,
  FactsStatusData,
  FactsStatusSummary,
  FactsSubmitSummary,
} from '../../../../mcp/tools/facts/index.js';
import type { Random } from '../../core/properties/helpers/createRandom.js';

import { checkAsyncProperty } from './helpers/checkAsyncProperty.js';
import { cleanupFactsProjects } from './helpers/createFactsProject.js';
import { createFactsWorld } from './helpers/factsWorld.js';
import type { FactsWorld, ToolMode, WorldFile } from './helpers/factsWorld.js';

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

/** How many rounds the oracle gets before liveness counts as broken. */
const ORACLE_ROUNDS = 8;

/** The two identities a dismissal needs to reach `dismissed`. */
const ACTORS = ['alpha', 'beta'];

/** Separator that cannot occur in a path, a kind or a reference. */
const SEPARATOR = String.fromCharCode(0);

/** One scenario's accumulated failure, or null while every invariant holds. */
type Failure = string | null;

afterEach(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
  cleanupFactsProjects();
});

describe('the facts state machine under random operation sequences', () => {
  it(
    'keeps every invariant and settles under an oracle that only follows reported next actions',
    async () => {
      await expect(
        checkAsyncProperty({ runs: 24, maxSize: 12, check: runScenario }),
      ).resolves.toBeUndefined();
    },
    600_000,
  );
});

/**
 * Drive one seeded scenario and report the first invariant it breaks.
 *
 * Random operations first, then an oracle that may use nothing but what the
 * responses said. Every invariant but liveness is judged after every call, not
 * only at the end: a narrowing the oracle would later repair by re-extracting
 * is still a narrowing, and checking only the settled world hides exactly the
 * defects that heal on the next honest submission.
 *
 * @param random - Deterministic source for this scenario.
 * @param size - Upper bound on files and random operations.
 * @returns Null when every invariant held, otherwise what broke and the log.
 */
async function runScenario(random: Random, size: number): Promise<Failure> {
  const stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-model-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  const log: string[] = [];
  try {
    const world = createFactsWorld(size);
    const stored = new Set<string>();
    for (let step = 0; step < size + 2; step += 1) {
      log.push(world.mutate(random));
      const failure =
        (await randomCall(world, random, log)) ??
        (await afterCall(world, stored));
      if (failure !== null) return explain(failure, log);
    }
    return explain(await driveOracle(world, random, log, stored), log);
  } finally {
    rmSync(stateRoot, { recursive: true, force: true });
    cleanupFactsProjects();
  }
}

/**
 * Make one random server call and check the invariants it can break.
 * @param world The modelled project.
 * @param random Deterministic source for this step.
 * @param log Running scenario log, appended to.
 * @returns Null when the call held every invariant.
 */
async function randomCall(
  world: FactsWorld,
  random: Random,
  log: string[],
): Promise<Failure> {
  const mode = random.pick(['exact', 'lossy', 'other'] as const);
  const choice = random.int(3);
  if (choice === 0) {
    log.push(`submit(${mode})`);
    return await submitAndCheck(world, mode, random);
  }
  if (choice === 1) {
    log.push(`compare(${mode})`);
    return await compareAndCheck(world, mode, random);
  }
  const open = (await readStatus(world)).data.unadjudicated.items;
  if (open.length === 0) return null;
  const item = random.pick(open);
  const decision = random.pick(['adopt', 'dismiss'] as const);
  const actor = random.pick(ACTORS);
  log.push(`adjudicate(${actor}, ${decision}) on ${nameOf(item)}`);
  return await adjudicateAndCheck(world, item, decision, actor);
}

/**
 * Submit what one tool reports, then reconcile the counts with the store.
 * @param world The modelled project.
 * @param mode Which modelled tool reports.
 * @param random Deterministic source, for what a lossy tool drops.
 * @param only Paths to submit, or null for everything the tool can read.
 * @returns Null when the response agreed with the store afterwards.
 */
async function submitAndCheck(
  world: FactsWorld,
  mode: ToolMode,
  random: Random,
  only: ReadonlySet<string> | null = null,
): Promise<Failure> {
  const before = storedItems(world);
  const status = await readStatus(world);
  const records = world.extract(mode, random, only ?? undefined);
  const file = world.project.submission('model.json', JSON.stringify(records));
  const result = await handleFacts({
    action: 'submit',
    path: world.project.root,
    file,
    resolutionEpoch: status.summary.resolutionEpoch,
  });
  const summary = result.summary as FactsSubmitSummary;
  const after = storedItems(world);
  const opened = [...after].filter(
    ([key, item]) =>
      item.state === FACTS_ADJUDICATION_STATES.UNADJUDICATED &&
      before.get(key)?.state !== FACTS_ADJUDICATION_STATES.UNADJUDICATED,
  ).length;
  const closed = [...after].filter(
    ([key, item]) =>
      item.state === FACTS_ADJUDICATION_STATES.CLOSED_BY_RECORD &&
      before.get(key)?.state !== FACTS_ADJUDICATION_STATES.CLOSED_BY_RECORD,
  ).length;
  if (summary.openedItems !== opened || summary.closedItems !== closed)
    return `I2: submit reported opened=${summary.openedItems} closed=${summary.closedItems}, the store holds opened=${opened} closed=${closed}`;
  return verdictsKept(before, after, 'submit');
}

/**
 * Compare a candidate, then reconcile the item count with the store.
 * @param world The modelled project.
 * @param mode Which modelled tool produced the candidate.
 * @param random Deterministic source, for what a lossy tool drops.
 * @returns Null when the response agreed with the store afterwards.
 */
async function compareAndCheck(
  world: FactsWorld,
  mode: ToolMode,
  random: Random,
): Promise<Failure> {
  const before = storedItems(world);
  const records = world.extract(mode, random);
  const file = world.project.submission(
    'candidate.json',
    JSON.stringify(records),
  );
  const result = await handleFacts({
    action: 'compare',
    path: world.project.root,
    file,
  });
  const summary = result.summary as FactsCompareSummary;
  const data = result.data as FactsCompareData;
  // Only the files compare actually visits: a record for a file the scope no
  // longer covers is skipped, and its page is left for the next submit to
  // clear, so counting it here would compare two different questions.
  const compared = new Set(
    records
      .map((record) => record.path)
      .filter((path) => world.covered(path) && world.fileOf(path) !== undefined),
  );
  const held = [...storedItems(world)].filter(([, item]) =>
    compared.has(item.path),
  ).length;
  if (summary.recordedItems !== held)
    return `I2: compare reported recordedItems=${summary.recordedItems}, the store holds ${held} for those files`;
  const missing = data.sideTableItems.filter(
    (item) => item.contentHash === '' || item.resolvedPath === '',
  );
  if (missing.length > 0)
    return `I2: compare returned an item without the fields adjudicate needs: ${nameOf(missing[0] as FactsOpenItem)}`;
  return verdictsKept(before, storedItems(world), 'compare');
}

/**
 * Apply one decision, then reconcile the outcome with the store.
 * @param world The modelled project.
 * @param item The item to judge, exactly as a response reported it.
 * @param decision What the actor claims.
 * @param actor Who claims it.
 * @returns Null when the response agreed with the store afterwards.
 */
async function adjudicateAndCheck(
  world: FactsWorld,
  item: FactsOpenItem,
  decision: 'adopt' | 'dismiss',
  actor: string,
): Promise<Failure> {
  const before = storedItems(world);
  const result = await handleFacts({
    action: 'adjudicate',
    path: world.project.root,
    sourcePath: item.path,
    contentHash: item.contentHash,
    actor,
    items: [
      {
        kind: item.kind,
        reference: item.reference,
        resolvedPath: item.resolvedPath,
        decision,
        ...(decision === 'dismiss' ? { reason: 'the model says so' } : {}),
      },
    ],
  });
  const summary = result.summary as FactsAdjudicateSummary;
  const after = storedItems(world);
  const moved = [...after].filter(
    ([key, one]) => before.get(key)?.state !== one.state,
  ).length;
  if (summary.applied !== moved)
    return `I2: adjudicate reported applied=${summary.applied}, ${moved} item(s) changed state in the store`;
  const refused = (result.data as FactsAdjudicateData).refused;
  if (refused.length > 0)
    return `I2: adjudicate refused an item the response itself reported (${refused[0]?.code}) for ${nameOf(item)}`;
  return null;
}

/**
 * Follow reported next actions until every file settles.
 *
 * The oracle knows the truth about the world but may only act on values the
 * responses carried: it extracts honestly, submits what status asks for, and
 * judges exactly the items status hands it, with a second identity for the
 * dismissals that need one. An item it cannot reach from a response is an item
 * it cannot judge, which is what makes this a liveness check rather than a
 * replay of the implementation.
 *
 * @param world The modelled project.
 * @param random Deterministic source for this scenario.
 * @param log Running scenario log, appended to.
 * @returns Null when the world settled within the round budget.
 */
async function driveOracle(
  world: FactsWorld,
  random: Random,
  log: string[],
  stored: Set<string>,
): Promise<Failure> {
  let previous = new Set<string>();
  for (let round = 0; round < ORACLE_ROUNDS; round += 1) {
    const status = await readStatus(world);
    const summary = status.summary;
    if (summary.missing + summary.needsResolution + summary.uncertain === 0)
      return null;
    const refusals = new Set<string>();
    if (summary.missing + summary.needsResolution > 0) {
      // Only what status asked for. An agent re-extracting every file on every
      // round would quietly repair records nobody asked it to look at, and the
      // omissions this model exists to find would heal before anyone saw them.
      const wanted = new Set([
        ...status.data.missing.paths,
        ...status.data.needsResolution.paths,
      ]);
      log.push(`oracle round ${round}: submit(exact) for ${wanted.size} file(s)`);
      const failure = await submitAndCheck(world, 'exact', random, wanted);
      if (failure !== null) return failure;
    } else if (status.data.unadjudicated.items.length > 0) {
      const actor = ACTORS[round % ACTORS.length] as string;
      log.push(
        `oracle round ${round}: adjudicate ${status.data.unadjudicated.items.length} item(s) as ${actor}`,
      );
      const failure = await judgeAll(world, status.data.unadjudicated.items, actor, refusals);
      if (failure !== null) return failure;
    } else
      return `I3: ${summary.uncertain} file(s) are uncertain but no response offered an item to judge`;
    const broken = await afterCall(world, stored);
    if (broken !== null) return broken;
    const repeated = [...refusals].filter((one) => previous.has(one));
    if (repeated.length > 0)
      return `I4: the same call was refused the same way twice in a row: ${repeated[0]}`;
    previous = refusals;
  }
  return `I3: the oracle did not settle within ${ORACLE_ROUNDS} rounds`;
}

/**
 * Judge every open item truthfully under one identity.
 * @param world The modelled project.
 * @param items Items exactly as status reported them.
 * @param actor The identity deciding this round.
 * @param refusals Set the refusal keys of this round are added to.
 * @returns Null when every decision landed or was honestly refused.
 */
async function judgeAll(
  world: FactsWorld,
  items: readonly FactsOpenItem[],
  actor: string,
  refusals: Set<string>,
): Promise<Failure> {
  for (const item of items) {
    const file = world.fileOf(item.path);
    const real =
      file !== undefined &&
      file.live.includes(item.reference) &&
      world.targetOf(item.reference) === item.resolvedPath;
    const result = await handleFacts({
      action: 'adjudicate',
      path: world.project.root,
      sourcePath: item.path,
      contentHash: item.contentHash,
      actor,
      items: [
        {
          kind: item.kind,
          reference: item.reference,
          resolvedPath: item.resolvedPath,
          decision: real ? 'adopt' : 'dismiss',
          ...(real ? {} : { reason: 'the reference is not a live import' }),
        },
      ],
    });
    for (const code of refusalCodes(result))
      refusals.add(`adjudicate ${nameOf(item)} as ${actor}: ${code}`);
  }
  return null;
}

/**
 * Fold what the store now holds into the set of edges it has been shown, then
 * check that none of them went missing.
 * @param world The modelled project.
 * @param stored Edges the store has held at any point, as `from -> to`.
 * @returns Null when every such edge is still accounted for.
 */
async function afterCall(
  world: FactsWorld,
  stored: Set<string>,
): Promise<Failure> {
  const storePaths = resolveFactsStorePaths(world.project.root);
  for (const record of readFactsStore(storePaths.directory).records.values())
    for (const reference of record.facts.references)
      if ('path' in reference.resolved)
        stored.add(`${record.facts.path} -> ${reference.resolved.path}`);
  return await checkLiveEdges(world, stored);
}

/**
 * Check that every real edge the store once held is still accounted for.
 *
 * Three preconditions, and each excludes something filid is right to do. The
 * file must be `exact` — a file the response calls missing or uncertain is one
 * filid is already saying it cannot vouch for. The edge must be real: the model
 * knows which specifiers are live imports and which only sit in a comment, and
 * dropping a commented one is the system being right for a reason it cannot
 * state (spec §4.2, P1). And the edge must have been in an accepted record at
 * some point: filid does not read source, so an import no accepted record ever
 * carried is an omission it provably cannot detect, and demanding it would be
 * demanding P1 be false.
 *
 * What is left is the claim the system does make: an edge it once stood behind,
 * still really there, in a file it now calls exact, is carried — in the record,
 * or adopted onto it — unless two actors put it down on the record. Anything
 * else is a graph that narrowed without saying so.
 *
 * @param world The modelled project.
 * @param stored Edges the store has held at any point, as `from -> to`.
 * @returns Null when every such edge is accounted for.
 */
async function checkLiveEdges(
  world: FactsWorld,
  stored: ReadonlySet<string>,
): Promise<Failure> {
  const status = await readStatus(world);
  const unsettled = new Set([
    ...status.data.missing.paths,
    ...status.data.needsResolution.paths,
    ...status.data.uncertain.paths,
    ...status.data.toolError.paths,
  ]);
  const storePaths = resolveFactsStorePaths(world.project.root);
  const records = new Map(
    [...readFactsStore(storePaths.directory).records.values()].map((record) => [
      record.facts.path,
      record,
    ]),
  );
  const table = readAdjudicationTable(storePaths.sideTableDirectory);
  for (const path of world.livePaths()) {
    if (!world.covered(path) || unsettled.has(path)) continue;
    const page = table.pages.get(storePaths.pathDigest(path));
    const valid = selectValidReferences(
      (records.get(path)?.facts.references ?? []).flatMap((reference) =>
        'path' in reference.resolved ? [reference.resolved.path] : [],
      ),
      page,
      path,
    );
    for (const specifier of (world.fileOf(path) as WorldFile).live) {
      const target = world.targetOf(specifier);
      if (target === null || !world.covered(target)) continue;
      if (!stored.has(`${path} -> ${target}`)) continue;
      if (valid.some((one) => one.resolvedPath === target)) continue;
      const dismissed = (page?.items ?? []).some(
        (item) =>
          item.reference === specifier &&
          item.resolvedPath === target &&
          item.state === FACTS_ADJUDICATION_STATES.DISMISSED,
      );
      if (!dismissed)
        return `I1: ${path} is exact and really imports ${specifier} (${target}), an edge the store once held, but it neither carries that edge now nor holds a confirmed dismissal for it`;
    }
  }
  return null;
}

/**
 * Check that no call without an actor erased an actor's verdict.
 *
 * Expiry is not erasure and is allowed: an item whose judged lines changed is
 * gone, and one opened afresh over the same edge carries a different
 * `lineDigest`, which is how the two are told apart.
 *
 * @param before Items keyed as of the call's start.
 * @param after Items keyed as of the call's end.
 * @param action Which call is being judged.
 * @returns Null when every surviving verdict is still the verdict.
 */
function verdictsKept(
  before: Map<string, AdjudicationItem>,
  after: Map<string, AdjudicationItem>,
  action: string,
): Failure {
  for (const [key, item] of before) {
    const judged =
      item.state === FACTS_ADJUDICATION_STATES.ADOPTED ||
      item.state === FACTS_ADJUDICATION_STATES.DISMISSED;
    const now = after.get(key);
    if (!judged || now === undefined || now.state === item.state) continue;
    if (now.lineDigest !== item.lineDigest) continue;
    return `I5: ${action} moved a ${item.state} item to ${now.state} without any actor deciding: ${key.split(SEPARATOR).join(' ')}`;
  }
  return null;
}

/**
 * Read status, typed.
 * @param world The modelled project.
 * @returns The status summary and data.
 */
async function readStatus(
  world: FactsWorld,
): Promise<{ summary: FactsStatusSummary; data: FactsStatusData }> {
  const result = await handleFacts({
    action: 'status',
    path: world.project.root,
  });
  return {
    summary: result.summary as FactsStatusSummary,
    data: result.data as FactsStatusData,
  };
}

/**
 * Every side-table item the store holds right now, keyed by identity.
 * @param world The modelled project.
 * @returns Items keyed by path, kind, reference and resolved path.
 */
function storedItems(world: FactsWorld): Map<string, AdjudicationItem> {
  const storePaths = resolveFactsStorePaths(world.project.root);
  const items = new Map<string, AdjudicationItem>();
  for (const page of readAdjudicationTable(storePaths.sideTableDirectory).pages
    .values())
    for (const item of page.items)
      items.set(
        [item.path, item.kind, item.reference, item.resolvedPath].join(
          SEPARATOR,
        ),
        item,
      );
  return items;
}

/**
 * The refusal codes a payload carries, ignoring per-record rejections.
 * @param result A tool payload.
 * @returns Codes that mean the call itself did not do its work.
 */
function refusalCodes(result: {
  status: string;
  diagnostics: readonly { code: string }[];
  data?: unknown;
}): string[] {
  const refused = (result.data as { refused?: { code: string }[] }).refused;
  return [
    ...(result.status === TOOL_STATUSES.INDETERMINATE
      ? result.diagnostics.map((one) => one.code)
      : []),
    ...(refused ?? []).map((one) => one.code),
  ];
}

/**
 * One item as a failure message spells it.
 * @param item The item to name.
 * @returns A short human-readable identity.
 */
function nameOf(item: FactsOpenItem): string {
  return `${item.path} ${item.kind} ${item.reference} -> ${item.resolvedPath} (${item.state})`;
}

/**
 * Attach the operation log to a failure.
 * @param failure What broke, or null.
 * @param log The scenario log.
 * @returns The annotated failure, or null.
 */
function explain(failure: Failure, log: readonly string[]): Failure {
  return failure === null ? null : `${failure}\nlog:\n  ${log.join('\n  ')}`;
}
