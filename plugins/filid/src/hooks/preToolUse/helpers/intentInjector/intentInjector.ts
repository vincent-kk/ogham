import * as path from 'node:path';

import { GUIDE_BLOCK } from '../../../../constants/agentContext.js';
import { CTX_TTL_TURNS_DEFAULT } from '../../../../constants/hookDefaults.js';
import {
  commitVisit,
  readBoundary,
  readFractalMap,
  writeBoundary,
} from '../../../../core/infra/cacheManager/cacheManager.js';
import type { FractalMap } from '../../../../core/infra/cacheManager/cacheManager.js';
import { buildChain } from '../../../../core/tree/boundaryDetector/boundaryDetector.js';
import type { HookOutput, PreToolUseInput } from '../../../../types/hooks.js';
import {
  isCriteriaMd,
  isDetailMd,
  isFcaProject,
  isIntentMd,
} from '../../../shared/shared.js';
import { readHookConfig } from '../../../utils/readHookConfig.js';
import { validateCwd } from '../../../utils/validateCwd.js';
import { visitScope } from '../../../utils/visitScope.js';

import { buildCtxBlock } from './utils/buildCtxBlock.js';
import { buildGateDeny } from './utils/buildGateDeny.js';
import { buildMapBlock } from './utils/buildMapBlock.js';
import { resolveOwnerIntent } from './utils/resolveOwnerIntent.js';
import { visitKey } from './utils/visitKey.js';

export type { FractalMap };

const toPosix = (p: string): string => p.replace(/\\/g, '/');

/**
 * Unified visit pipeline for Read | Write | Edit.
 *
 * Resolves the owner fractal's delivery state (none | stale | fresh) through
 * the locked `commitVisit` transaction and emits accordingly:
 * - none + Read → [filid:ctx] with the owner INTENT body inline
 * - none + mutation (gate-eligible) → deny with the rules inline in the
 *   reason; the identical retry passes (delivery was stamped)
 * - stale → soft [filid:ctx] re-delivery, tool proceeds
 * - fresh → silent
 * [filid:map] is emitted only when the turn's visit set changed. A directory
 * already visited this turn is fully silent (fast path).
 */
export function processVisit(
  input: PreToolUseInput,
  spikeMode = false,
): HookOutput {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };
  if (!isFcaProject(safeCwd)) return { continue: true };

  const rawPath = input.tool_input.file_path ?? input.tool_input.path ?? '';
  if (!rawPath) return { continue: true };
  const filePath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(safeCwd, rawPath);
  const fileDir = path.dirname(filePath);
  const mutation = input.tool_name === 'Write' || input.tool_name === 'Edit';
  const scope = visitScope(input);

  // Fast path: a directory already in this turn's reads was settled by an
  // earlier commitVisit — delivery is fresh within the same turn, the map is
  // current. Fully silent, mutations included.
  const cachedBoundary = readBoundary(safeCwd, input.session_id, fileDir);
  if (cachedBoundary !== null) {
    const relDir = toPosix(path.relative(cachedBoundary, fileDir)) || '.';
    if (
      readFractalMap(safeCwd, scope).reads.includes(
        visitKey(cachedBoundary, relDir),
      )
    )
      return { continue: true };
  }

  const chainResult = buildChain(filePath);
  if (!chainResult) return { continue: true };
  const { boundary, chain, intents, details } = chainResult;
  if (cachedBoundary === null)
    writeBoundary(safeCwd, input.session_id, fileDir, boundary);

  const relDir = toPosix(path.relative(boundary, fileDir)) || '.';
  const relFile = toPosix(path.relative(boundary, filePath));
  const readKey = visitKey(boundary, relDir);

  const selfAuthoring = mutation && isIntentMd(filePath);
  const { intentContent, ownerDir } = resolveOwnerIntent(
    fileDir,
    chain,
    intents,
  );
  const hasOwner = intentContent !== undefined;
  const ownerRelDir = toPosix(path.relative(boundary, ownerDir)) || '.';
  // Self-authoring delivers the module being documented, whether or not its
  // INTENT.md existed on disk before this write.
  const ownerKey = selfAuthoring
    ? readKey
    : hasOwner
      ? visitKey(boundary, ownerRelDir)
      : null;

  const docTarget =
    isIntentMd(filePath) || isDetailMd(filePath) || isCriteriaMd(filePath);
  const gateEligible = mutation && hasOwner && !docTarget && !spikeMode;

  const ttlTurns =
    readHookConfig(safeCwd)?.injection?.ctxTtlTurns ?? CTX_TTL_TURNS_DEFAULT;

  const decision = commitVisit(safeCwd, scope, {
    readKey,
    ownerKey,
    ttlTurns,
    gateEligible,
    silentDelivery: selfAuthoring,
  });

  const ctxBlock = (): string =>
    buildCtxBlock(
      relFile,
      intentContent,
      chain,
      intents,
      details,
      boundary,
      ownerDir,
    );

  if (gateEligible && decision.deliveredState === 'none')
    return buildGateDeny(ownerRelDir, ctxBlock(), decision.guideNeeded);

  const blocks: string[] = [];
  if (
    ownerKey !== null &&
    decision.deliveredState !== 'fresh' &&
    !selfAuthoring
  ) {
    if (decision.guideNeeded) blocks.push(GUIDE_BLOCK);
    blocks.push(ctxBlock());
  }
  if (decision.mapChanged) blocks.push(buildMapBlock(decision.reads, relDir));

  const additionalContext = blocks.join('\n');
  if (!additionalContext.trim()) return { continue: true };

  return {
    continue: true,
    hookSpecificOutput: { additionalContext },
  };
}
