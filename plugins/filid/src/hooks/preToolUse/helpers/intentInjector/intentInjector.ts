import { normalize, portableRelative } from '@ogham/cross-platform';

import {
  CTX_TTL_TURNS_DEFAULT,
  HOOK_TOOL_NAME,
} from '../../../../constants/hookDefaults.js';
import { PORTABLE_PATH_MARKERS } from '../../../../constants/pathMarkers.js';
import { writeBoundary } from '../../../../core/infra/cacheManager/caches/boundaryCache.js';
import { commitVisit } from '../../../../core/infra/cacheManager/caches/fractalMapCache.js';
import type { FractalMap } from '../../../../core/infra/cacheManager/caches/fractalMapCache.js';
import { buildChain } from '../../../../core/tree/boundaryDetector/boundaryDetector.js';
import type { HookOutput, PreToolUseInput } from '../../../../types/hooks.js';
import { isFcaProject } from '../../../shared/utils/isFcaProject.js';
import { readHookConfig } from '../../../utils/readHookConfig.js';
import { validateCwd } from '../../../utils/validateCwd.js';
import { visitScope } from '../../../utils/visitScope.js';

import { buildCtxBlock } from './utils/buildCtxBlock.js';
import { buildDeliveryOutput } from './utils/buildDeliveryOutput.js';
import { isFastPathSettled } from './utils/isFastPathSettled.js';
import { resolveGateContext } from './utils/resolveGateContext.js';
import { resolveVisitedPath } from './utils/resolveVisitedPath.js';
import { visitKey } from './utils/visitKey.js';

export type { FractalMap };

/**
 * Unified visit pipeline for Read | Write | Edit | Delete.
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
export function processVisit(input: PreToolUseInput): HookOutput {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };
  if (!isFcaProject(safeCwd)) return { continue: true };

  const rawPath =
    input.tool_input.file_path ??
    input.tool_input.path ??
    PORTABLE_PATH_MARKERS.EMPTY;
  if (!rawPath) return { continue: true };
  // The resolver derives the parent from the absolute file path portably.
  const { filePath, fileDir } = resolveVisitedPath(safeCwd, rawPath);
  const mutation =
    input.tool_name === HOOK_TOOL_NAME.WRITE ||
    input.tool_name === HOOK_TOOL_NAME.EDIT ||
    input.tool_name === HOOK_TOOL_NAME.DELETE;
  const scope = visitScope(input);

  const { cachedBoundary, settled } = isFastPathSettled(
    safeCwd,
    input.session_id,
    fileDir,
    scope,
  );
  if (settled) return { continue: true };

  const chainResult = buildChain(filePath);
  if (!chainResult) return { continue: true };
  const { boundary, chain, intents, details } = chainResult;
  if (cachedBoundary === null)
    writeBoundary(safeCwd, input.session_id, fileDir, boundary);

  const relDir =
    normalize(portableRelative(boundary, fileDir)) ||
    PORTABLE_PATH_MARKERS.CURRENT;
  const relFile = normalize(portableRelative(boundary, filePath));
  const readKey = visitKey(boundary, relDir);

  const {
    intentContent,
    ownerDir,
    ownerKey,
    ownerRelDir,
    gateEligible,
    selfAuthoring,
  } = resolveGateContext(
    filePath,
    fileDir,
    chain,
    intents,
    boundary,
    readKey,
    mutation,
  );

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

  return buildDeliveryOutput(
    decision,
    gateEligible,
    ownerKey,
    ownerRelDir,
    selfAuthoring,
    relDir,
    ctxBlock,
  );
}
