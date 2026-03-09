import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

import { buildChain } from '../core/boundary-detector.js';
import {
  readBoundary,
  readFractalMap,
  writeBoundary,
  writeFractalMap,
} from '../core/cache-manager.js';
import type { FractalMap } from '../core/cache-manager.js';
import type { HookOutput, PreToolUseInput } from '../types/hooks.js';

import { isFcaProject } from './shared.js';

export type { FractalMap };

/**
 * Compress paths using brace expansion notation.
 * Input: ["src/payment/checkout", "src/payment/refund", "src/auth"]
 * Output: "src/{payment/{checkout,refund},auth}"
 *
 * Simple implementation: find common prefixes and group.
 * For a single path, just return it. For paths with no common prefix, join with comma.
 */
export function compressPaths(paths: string[], currentDir?: string): string {
  if (paths.length === 0) return '';
  if (paths.length === 1) {
    const p = paths[0];
    if (currentDir && p === currentDir) return `${p}/*`;
    return p;
  }

  // Mark currentDir with * suffix
  const marked = paths.map((p) =>
    currentDir && p === currentDir ? `${p}/*` : p,
  );

  return compressGroup(marked);
}

/**
 * Recursively compress a list of path strings into brace notation.
 */
function compressGroup(paths: string[]): string {
  if (paths.length === 0) return '';
  if (paths.length === 1) return paths[0];

  // Split each path into [head, ...tail] by first '/'
  const split = paths.map((p) => {
    const idx = p.indexOf('/');
    if (idx === -1) return { head: p, tail: '' };
    return { head: p.slice(0, idx), tail: p.slice(idx + 1) };
  });

  // Group by head segment
  const groups = new Map<string, string[]>();
  for (const { head, tail } of split) {
    const existing = groups.get(head) ?? [];
    existing.push(tail);
    groups.set(head, existing);
  }

  const parts: string[] = [];
  for (const [head, tails] of groups) {
    const nonEmpty = tails.filter((t) => t !== '');
    if (nonEmpty.length === 0) {
      parts.push(head);
    } else if (nonEmpty.length === 1) {
      parts.push(`${head}/${nonEmpty[0]}`);
    } else {
      const inner = compressGroup(nonEmpty);
      parts.push(`${head}/{${inner}}`);
    }
  }

  return parts.join(',');
}

/**
 * Build the [filid:ctx] injection text for first visit to a directory.
 */
function buildCtxBlock(
  relFile: string,
  intentContent: string | undefined,
  chain: string[],
  intents: Map<string, boolean>,
  details: Map<string, boolean>,
  boundary: string,
  ownerDir: string,
): string {
  const lines: string[] = [];
  lines.push(`[filid:ctx] ${relFile}`);

  // Intent line — point to owning fractal's INTENT.md, not organ's
  const ownerRelDir =
    path.relative(boundary, ownerDir).replace(/\\/g, '/') || '.';
  const intentPath = path.join(ownerRelDir, 'INTENT.md');
  lines.push(`intent: ${intentPath}`);

  if (intentContent !== undefined) {
    lines.push('---');
    lines.push(intentContent.trimEnd());
    lines.push('---');
  }

  // Chain: ancestor directories with INTENT.md, skip ownerDir (already inlined)
  const chainIntents = chain
    .filter((d) => d !== ownerDir && intents.get(d))
    .map((d) =>
      path.join(path.relative(boundary, d), 'INTENT.md').replace(/\\/g, '/'),
    );

  if (chainIntents.length > 0) {
    lines.push(`chain: ${chainIntents.join(' > ')}`);
  }

  // Detail hint (check owning fractal for DETAIL.md too)
  if (details.get(ownerDir)) {
    const detailPath = path.join(ownerRelDir, 'DETAIL.md');
    lines.push(`detail: ${detailPath}`);
  }

  return lines.join('\n');
}

/**
 * One-time guide block injected on the very first [filid:ctx] of a session.
 * Teaches the LLM what the injected tokens mean and how to act on them.
 */
const GUIDE_BLOCK = [
  '[filid:guide]',
  '[filid:ctx] — module boundary rules for the current directory.',
  '  intent: INTENT.md path. --- ... --- is its inline content. Obey these rules.',
  '  chain: parent INTENT.md paths (nearest > root). Each is a readable file — read to learn parent rules.',
  '  detail: DETAIL.md path. Read BEFORE writing code in this module.',
  '[filid:map] — visited directories this session. /* = current working directory.',
].join('\n');

/**
 * Build [filid:map] line from visited reads list.
 */
function buildMapBlock(reads: string[], currentDir: string): string {
  const compressed = compressPaths(reads, currentDir);
  return `[filid:map] ${compressed}`;
}

/**
 * Inject INTENT.md context for PreToolUse (Read|Write|Edit).
 * Returns additional context to inject into the agent.
 */
export function injectIntent(input: PreToolUseInput): HookOutput {
  if (!isFcaProject(input.cwd)) {
    return { continue: true };
  }

  const rawPath = input.tool_input.file_path ?? input.tool_input.path ?? '';
  if (!rawPath) {
    return { continue: true };
  }

  // Resolve absolute file path
  const filePath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(input.cwd, rawPath);

  const fileDir = path.dirname(filePath);

  const sessionId = input.session_id;
  const fcaMap = readFractalMap(input.cwd, sessionId);

  // Build context chain to determine boundary (with boundary cache)
  const cachedBoundary = readBoundary(input.cwd, sessionId, fileDir);
  const chainResult = buildChain(filePath);
  if (!chainResult) {
    return { continue: true };
  }

  const { boundary, chain, intents, details } = chainResult;

  // Cache boundary if not already cached
  if (cachedBoundary === null) {
    writeBoundary(input.cwd, sessionId, fileDir, boundary);
  }

  // Relative paths for display
  const relDir = path.relative(boundary, fileDir).replace(/\\/g, '/') || '.';
  const relFile = path.relative(boundary, filePath).replace(/\\/g, '/');

  // Add to reads (dedup)
  if (!fcaMap.reads.includes(relDir)) {
    fcaMap.reads.push(relDir);
  }

  const isFirstVisit = !fcaMap.intents.includes(relDir);
  const isFirstCtxEver = fcaMap.intents.length === 0;

  const blocks: string[] = [];

  if (isFirstVisit) {
    // Mark as visited
    if (intents.get(fileDir)) {
      if (!fcaMap.intents.includes(relDir)) {
        fcaMap.intents.push(relDir);
      }
    } else {
      // Still track as first visit even without INTENT.md
      if (!fcaMap.intents.includes(relDir)) {
        fcaMap.intents.push(relDir);
      }
    }
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
    const ownerRelDir =
      path.relative(boundary, ownerDir).replace(/\\/g, '/') || '.';
    if (ownerDir !== fileDir && !fcaMap.intents.includes(ownerRelDir)) {
      fcaMap.intents.push(ownerRelDir);
    }

    // Only build ctx block if there's actual intent content or chain context
    if (
      intentContent !== undefined ||
      chain.filter((d) => d !== ownerDir).some((d) => intents.get(d))
    ) {
      // Inject guide once per session, before the very first ctx block
      if (isFirstCtxEver) {
        blocks.push(GUIDE_BLOCK);
      }
      blocks.push(
        buildCtxBlock(relFile, intentContent, chain, intents, details, boundary, ownerDir),
      );
    }
  }

  // Always append map block
  blocks.push(buildMapBlock(fcaMap.reads, relDir));

  writeFractalMap(input.cwd, sessionId, fcaMap);

  const additionalContext = blocks.join('\n');
  if (!additionalContext.trim()) {
    return { continue: true };
  }

  return {
    continue: true,
    hookSpecificOutput: { additionalContext },
  };
}
