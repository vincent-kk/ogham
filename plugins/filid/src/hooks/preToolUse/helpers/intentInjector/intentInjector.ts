import * as path from 'node:path';

import { CTX_TTL_TURNS_DEFAULT } from '../../../../constants/hookDefaults.js';
import {
  commitVisit,
  writeBoundary,
} from '../../../../core/infra/cacheManager/cacheManager.js';
import type { FractalMap } from '../../../../core/infra/cacheManager/cacheManager.js';
import { buildChain } from '../../../../core/tree/boundaryDetector/boundaryDetector.js';
import type { HookOutput, PreToolUseInput } from '../../../../types/hooks.js';
import { isFcaProject } from '../../../shared/shared.js';
import { readHookConfig } from '../../../utils/readHookConfig.js';
import { validateCwd } from '../../../utils/validateCwd.js';
import { visitScope } from '../../../utils/visitScope.js';

import { buildCtxBlock } from './utils/buildCtxBlock.js';
import { buildDeliveryOutput } from './utils/buildDeliveryOutput.js';
import { isFastPathSettled } from './utils/isFastPathSettled.js';
import { resolveGateContext } from './utils/resolveGateContext.js';
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

  const relDir = toPosix(path.relative(boundary, fileDir)) || '.';
  const relFile = toPosix(path.relative(boundary, filePath));
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
    spikeMode,
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
