import * as path from 'node:path';

import { GUIDE_BLOCK } from '../../../../constants/agentContext.js';
import {
  hasGuideInjected,
  markGuideInjected,
  readBoundary,
  readFractalMap,
  writeBoundary,
  writeFractalMap,
} from '../../../../core/infra/cacheManager/cacheManager.js';
import type { FractalMap } from '../../../../core/infra/cacheManager/cacheManager.js';
import {
  buildChain,
  findBoundary,
} from '../../../../core/tree/boundaryDetector/boundaryDetector.js';
import type { HookOutput, PreToolUseInput } from '../../../../types/hooks.js';
import { isFcaProject } from '../../../shared/shared.js';
import { validateCwd } from '../../../utils/validateCwd.js';

import { buildCtxBlock } from './utils/buildCtxBlock.js';
import { buildMapBlock } from './utils/buildMapBlock.js';
import { resolveOwnerIntent } from './utils/resolveOwnerIntent.js';
import { visitKey } from './utils/visitKey.js';

export type { FractalMap };

/**
 * Record a Write/Edit target directory in fcaMap.reads WITHOUT marking its
 * INTENT.md as surfaced. A dir that was modified but never read then shows
 * up as `unread-intent` on subsequent [filid:map] blocks — the signal that
 * a module is being changed before its boundary rules were read.
 */
export function recordWriteVisit(input: PreToolUseInput): void {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null || !isFcaProject(safeCwd)) return;

  const rawPath = input.tool_input.file_path ?? input.tool_input.path ?? '';
  if (!rawPath) return;
  const filePath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(safeCwd, rawPath);
  const fileDir = path.dirname(filePath);

  const sessionId = input.session_id;
  const cachedBoundary = readBoundary(safeCwd, sessionId, fileDir);
  const boundary = cachedBoundary ?? findBoundary(filePath);
  if (boundary === null) return;
  if (cachedBoundary === null)
    writeBoundary(safeCwd, sessionId, fileDir, boundary);

  const relDir = path.relative(boundary, fileDir).replace(/\\/g, '/') || '.';
  const key = visitKey(boundary, relDir);
  const fcaMap = readFractalMap(safeCwd, sessionId);
  if (fcaMap.reads.includes(key)) return;
  fcaMap.reads.push(key);
  writeFractalMap(safeCwd, sessionId, fcaMap);
}

/**
 * Fast path: boundary is cached and its directory was already visited this
 * session. Skips buildChain entirely — only refreshes reads + [filid:map].
 * Returns null when the fast path does not apply (fall through to full path).
 */
function tryCachedVisitOutput(
  cachedBoundary: string | null,
  fileDir: string,
  fcaMap: FractalMap,
  sessionId: string,
  safeCwd: string,
): HookOutput | null {
  if (cachedBoundary === null) return null;

  const relDir =
    path.relative(cachedBoundary, fileDir).replace(/\\/g, '/') || '.';
  const key = visitKey(cachedBoundary, relDir);
  if (!fcaMap.intents.includes(key)) return null;

  if (!fcaMap.reads.includes(key)) fcaMap.reads.push(key);

  const mapBlock = buildMapBlock(fcaMap.reads, relDir, fcaMap.intents);
  writeFractalMap(safeCwd, sessionId, fcaMap);
  return mapBlock.trim()
    ? { continue: true, hookSpecificOutput: { additionalContext: mapBlock } }
    : { continue: true };
}

/**
 * Mark the owning fractal directory as visited (if different from fileDir)
 * so sibling organs or the owner itself don't re-inline its INTENT.md later.
 * Returns whether the owner was already marked before this call.
 */
function markOwnerVisited(
  fcaMap: FractalMap,
  boundary: string,
  ownerDir: string,
  fileDir: string,
): boolean {
  const ownerRelDir =
    path.relative(boundary, ownerDir).replace(/\\/g, '/') || '.';
  const ownerKey = visitKey(boundary, ownerRelDir);
  const ownerAlreadyVisited =
    ownerDir !== fileDir && fcaMap.intents.includes(ownerKey);
  if (ownerDir !== fileDir && !ownerAlreadyVisited)
    fcaMap.intents.push(ownerKey);
  return ownerAlreadyVisited;
}

/**
 * Build the [filid:guide] + [filid:ctx] blocks for a first-time directory
 * visit. Skips ctx entirely when the owning fractal was already inlined by
 * a sibling organ visit, or when there's no intent content or chain context.
 */
function buildFirstVisitBlocks(
  ownerAlreadyVisited: boolean,
  intentContent: string | undefined,
  chain: string[],
  intents: Map<string, boolean>,
  details: Map<string, boolean>,
  boundary: string,
  ownerDir: string,
  relFile: string,
  guideNeeded: boolean,
  sessionId: string,
  safeCwd: string,
): string[] {
  const blocks: string[] = [];

  const hasContext =
    !ownerAlreadyVisited &&
    (intentContent !== undefined ||
      chain.filter((d) => d !== ownerDir).some((d) => intents.get(d)));
  if (!hasContext) return blocks;

  if (guideNeeded) {
    blocks.push(GUIDE_BLOCK);
    markGuideInjected(sessionId, safeCwd);
  }
  blocks.push(
    buildCtxBlock(
      relFile,
      intentContent,
      chain,
      intents,
      details,
      boundary,
      ownerDir,
    ),
  );
  return blocks;
}

/**
 * Inject INTENT.md context for PreToolUse (Read).
 * Returns additional context to inject into the agent.
 */
export function injectIntent(input: PreToolUseInput): HookOutput {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };

  if (!isFcaProject(safeCwd)) return { continue: true };

  const rawPath = input.tool_input.file_path ?? input.tool_input.path ?? '';
  if (!rawPath) return { continue: true };

  // Resolve absolute file path
  const filePath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(safeCwd, rawPath);

  const fileDir = path.dirname(filePath);

  const sessionId = input.session_id;
  const fcaMap = readFractalMap(safeCwd, sessionId);

  // Build context chain to determine boundary (with boundary cache)
  const cachedBoundary = readBoundary(safeCwd, sessionId, fileDir);

  // Skip full buildChain when boundary is cached and dir was already visited
  const cachedOutput = tryCachedVisitOutput(
    cachedBoundary,
    fileDir,
    fcaMap,
    sessionId,
    safeCwd,
  );
  if (cachedOutput) return cachedOutput;

  const chainResult = buildChain(filePath);
  if (!chainResult) return { continue: true };

  const { boundary, chain, intents, details } = chainResult;

  // Cache boundary if not already cached
  if (cachedBoundary === null)
    writeBoundary(safeCwd, sessionId, fileDir, boundary);

  // Relative paths for display
  const relDir = path.relative(boundary, fileDir).replace(/\\/g, '/') || '.';
  const relFile = path.relative(boundary, filePath).replace(/\\/g, '/');
  const key = visitKey(boundary, relDir);

  // Add to reads (dedup)
  if (!fcaMap.reads.includes(key)) fcaMap.reads.push(key);

  const isFirstVisit = !fcaMap.intents.includes(key);
  const guideNeeded = !hasGuideInjected(sessionId, safeCwd);

  const blocks: string[] = [];

  if (isFirstVisit) {
    fcaMap.intents.push(key);
    if (details.get(fileDir))
      if (!fcaMap.details.includes(key)) fcaMap.details.push(key);

    // Find INTENT.md: current dir first, then walk up chain to owning fractal
    const { intentContent, ownerDir } = resolveOwnerIntent(
      fileDir,
      chain,
      intents,
    );

    const ownerAlreadyVisited = markOwnerVisited(
      fcaMap,
      boundary,
      ownerDir,
      fileDir,
    );

    blocks.push(
      ...buildFirstVisitBlocks(
        ownerAlreadyVisited,
        intentContent,
        chain,
        intents,
        details,
        boundary,
        ownerDir,
        relFile,
        guideNeeded,
        sessionId,
        safeCwd,
      ),
    );
  }

  // Always append map block
  blocks.push(buildMapBlock(fcaMap.reads, relDir, fcaMap.intents));

  writeFractalMap(safeCwd, sessionId, fcaMap);

  const additionalContext = blocks.join('\n');
  if (!additionalContext.trim()) return { continue: true };

  return {
    continue: true,
    hookSpecificOutput: { additionalContext },
  };
}
