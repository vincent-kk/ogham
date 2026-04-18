import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

import { GUIDE_BLOCK } from '../../../../constants/agent-context.js';
import {
  hasGuideInjected,
  markGuideInjected,
  readBoundary,
  readFractalMap,
  writeBoundary,
  writeFractalMap,
} from '../../../../core/infra/cache-manager/cache-manager.js';
import type { FractalMap } from '../../../../core/infra/cache-manager/cache-manager.js';
import { buildChain } from '../../../../core/tree/boundary-detector/boundary-detector.js';
import type { HookOutput, PreToolUseInput } from '../../../../types/hooks.js';
import { isFcaProject } from '../../../shared/shared.js';
import { validateCwd } from '../../../utils/validate-cwd.js';

import { buildCtxBlock } from './utils/build-ctx-block.js';
import { buildMapBlock } from './utils/build-map-block.js';

export type { FractalMap };

/**
 * Inject INTENT.md context for PreToolUse (Read|Write|Edit).
 * Returns additional context to inject into the agent.
 */
export function injectIntent(input: PreToolUseInput): HookOutput {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };

  if (!isFcaProject(safeCwd)) {
    return { continue: true };
  }

  const rawPath = input.tool_input.file_path ?? input.tool_input.path ?? '';
  if (!rawPath) {
    return { continue: true };
  }

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
  if (cachedBoundary !== null) {
    const relDir =
      path.relative(cachedBoundary, fileDir).replace(/\\/g, '/') || '.';
    if (fcaMap.intents.includes(relDir)) {
      // Already visited — only update reads + map block
      if (!fcaMap.reads.includes(relDir)) {
        fcaMap.reads.push(relDir);
      }
      const mapBlock = buildMapBlock(fcaMap.reads, relDir, fcaMap.intents);
      writeFractalMap(safeCwd, sessionId, fcaMap);
      return mapBlock.trim()
        ? {
            continue: true,
            hookSpecificOutput: { additionalContext: mapBlock },
          }
        : { continue: true };
    }
  }

  const chainResult = buildChain(filePath);
  if (!chainResult) {
    return { continue: true };
  }

  const { boundary, chain, intents, details } = chainResult;

  // Cache boundary if not already cached
  if (cachedBoundary === null) {
    writeBoundary(safeCwd, sessionId, fileDir, boundary);
  }

  // Relative paths for display
  const relDir = path.relative(boundary, fileDir).replace(/\\/g, '/') || '.';
  const relFile = path.relative(boundary, filePath).replace(/\\/g, '/');

  // Add to reads (dedup)
  if (!fcaMap.reads.includes(relDir)) {
    fcaMap.reads.push(relDir);
  }

  const isFirstVisit = !fcaMap.intents.includes(relDir);
  const guideNeeded = !hasGuideInjected(sessionId, safeCwd);

  const blocks: string[] = [];

  if (isFirstVisit) {
    fcaMap.intents.push(relDir);
    if (details.get(fileDir)) {
      if (!fcaMap.details.includes(relDir)) {
        fcaMap.details.push(relDir);
      }
    }

    // Find INTENT.md: current dir first, then walk up chain to owning fractal
    let intentAbsPath: string | undefined;
    let ownerDir = fileDir;

    if (existsSync(path.join(fileDir, 'INTENT.md'))) {
      intentAbsPath = path.join(fileDir, 'INTENT.md');
    } else {
      for (let i = 1; i < chain.length; i++) {
        if (intents.get(chain[i])) {
          intentAbsPath = path.join(chain[i], 'INTENT.md');
          ownerDir = chain[i];
          break;
        }
      }
    }

    let intentContent: string | undefined;
    if (intentAbsPath) {
      try {
        intentContent = readFileSync(intentAbsPath, 'utf-8');
      } catch {
        // ignore
      }
    }

    // Mark owning fractal as visited too (if different from fileDir)
    // This prevents re-inlining when sibling organs or the owner itself are visited later
    const ownerRelDir =
      path.relative(boundary, ownerDir).replace(/\\/g, '/') || '.';
    const ownerAlreadyVisited =
      ownerDir !== fileDir && fcaMap.intents.includes(ownerRelDir);
    if (ownerDir !== fileDir && !ownerAlreadyVisited) {
      fcaMap.intents.push(ownerRelDir);
    }

    // Only build ctx block if there's actual intent content or chain context
    // Skip if the owning fractal was already inlined by a sibling organ visit
    if (
      !ownerAlreadyVisited &&
      (intentContent !== undefined ||
        chain.filter((d) => d !== ownerDir).some((d) => intents.get(d)))
    ) {
      // Inject guide once per session, before the very first ctx block
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
    }
  }

  // Always append map block
  blocks.push(buildMapBlock(fcaMap.reads, relDir, fcaMap.intents));

  writeFractalMap(safeCwd, sessionId, fcaMap);

  const additionalContext = blocks.join('\n');
  if (!additionalContext.trim()) {
    return { continue: true };
  }

  return {
    continue: true,
    hookSpecificOutput: { additionalContext },
  };
}
