import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  type CodexMoveProvenance,
  type NormalizeCodexToolUsesResult,
  type NormalizedCodexToolUse,
  canonicalizeTargetPathSync,
} from '@ogham/cross-platform';

import {
  DENY_RETRY_GUIDANCE,
  HOOK_TOOL_NAME,
} from '../../constants/hookDefaults.js';
import type { HookOutput, PreToolUseInput } from '../../types/hooks.js';
import { isDetailMd } from '../shared/utils/isDetailMd.js';
import { isFcaProject } from '../shared/utils/isFcaProject.js';
import { isIntentMd } from '../shared/utils/isIntentMd.js';
import { validateCwd } from '../utils/validateCwd.js';

import { processVisit } from './helpers/intentInjector/intentInjector.js';
import {
  projectMoveContent,
  validatePreToolUse,
} from './helpers/preToolValidator/preToolValidator.js';
import { guardStructure } from './helpers/structureGuard/structureGuard.js';
import { mergeResults } from './utils/mergeResults.js';

/** Codex Move provenance with Filid's local validation state. */
type FilidMoveProvenance = CodexMoveProvenance & {
  /** Marks content that conservatively over-approximates a failed projection. */
  projection?: 'approximate';
};

/** Filid input after optional Codex normalization metadata is attached. */
type FilidPreToolUseInput = Omit<
  NormalizedCodexToolUse<PreToolUseInput>,
  'codexPatch'
> & {
  /** Shared Move evidence plus Filid-only projection state. */
  codexPatch?: FilidMoveProvenance;
};

/** A Move destination prepared for ordinary Write validation. */
type PreparedMoveInput =
  { ok: true; input: FilidPreToolUseInput } | { ok: false; denial: HookOutput };

/**
 * Unified PreToolUse hook orchestrator.
 * Read | Write | Edit | Delete all enter the visit pipeline (`processVisit`)
 * first; mutations continue into their applicable validators and guards.
 *
 * FCA opt-in gate: projects without a `.filid/` marker or INTENT.md are not
 * governed at all — validation and guards are as opt-in as injection.
 *
 * Visit delivery never decides permission; mutation calls continue through
 * the validator and structure guard in the same invocation.
 *
 * Branch names and criteria ledgers do not affect hook permission decisions.
 */
export async function handlePreToolUse(
  input: FilidPreToolUseInput,
): Promise<HookOutput> {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };
  if (!isFcaProject(safeCwd)) return { continue: true };

  const mutation =
    input.tool_name === HOOK_TOOL_NAME.WRITE ||
    input.tool_name === HOOK_TOOL_NAME.EDIT ||
    input.tool_name === HOOK_TOOL_NAME.DELETE;

  const visit = processVisit(input);
  if (!mutation) return mergeResults([visit]);

  const prepared = prepareMoveDestination(input, safeCwd);
  if (!prepared.ok) return mergeResults([visit, prepared.denial]);
  const effectiveInput = prepared.input;
  const filePath =
    effectiveInput.tool_input.file_path ?? effectiveInput.tool_input.path ?? '';
  if (
    effectiveInput.tool_name === HOOK_TOOL_NAME.EDIT &&
    wasTouchedEarlier(effectiveInput, filePath, safeCwd)
  )
    return mergeResults([visit, denyStalePatchTarget(filePath)]);
  let oldContent: string | undefined;
  if (
    effectiveInput.tool_name !== HOOK_TOOL_NAME.DELETE &&
    isDetailMd(filePath)
  )
    try {
      oldContent = readFileSync(resolve(safeCwd, filePath), 'utf-8');
    } catch {
      /* new file */
    }

  const structure = guardStructure(effectiveInput);
  return mergeResults([
    visit,
    validatePreToolUse(effectiveInput, oldContent),
    enforceApproximateStructureCheck(effectiveInput, structure),
  ]);
}

/** Prepare exact or conservative content for one normalized Move Write. */
function prepareMoveDestination(
  input: FilidPreToolUseInput,
  safeCwd: string,
): PreparedMoveInput {
  const move = input.codexPatch;
  if (!move || move.role !== 'destination') return { ok: true, input };
  if (wasTouchedEarlier(input, move.sourcePath, safeCwd))
    return { ok: false, denial: denyStalePatchTarget(move.sourcePath) };
  const projection = projectMoveContent(move, safeCwd);
  if (projection.kind === 'missing-source')
    return { ok: false, denial: denyMissingMoveSource(move.sourcePath) };
  if (projection.kind === 'exact')
    return {
      ok: true,
      input: {
        ...input,
        tool_input: { ...input.tool_input, content: projection.content },
      },
    };
  if (isIntentMd(move.destinationPath) || isDetailMd(move.destinationPath))
    return {
      ok: false,
      denial: denyInexactContractMove(
        move.destinationPath,
        projection.kind,
        projection.hunkIndex,
      ),
    };
  const current = readMoveSource(move.sourcePath, safeCwd);
  if (current === undefined)
    return { ok: false, denial: denyMissingMoveSource(move.sourcePath) };
  const separator = current === '' || current.endsWith('\n') ? '' : '\n';
  const content = `${current}${separator}${move.addedLines.join('\n')}`;
  return {
    ok: true,
    input: {
      ...input,
      codexPatch: { ...move, projection: 'approximate' },
      tool_input: { ...input.tool_input, content },
    },
  };
}

/**
 * Compare prior raw patch paths through the host filesystem.
 *
 * @param input - Normalized logical operation carrying prior path evidence
 * @param targetPath - Current source or Edit target path
 * @param safeCwd - Validated project root for canonical resolution
 * @returns Whether an earlier physical section touched the same target
 */
function wasTouchedEarlier(
  input: FilidPreToolUseInput,
  targetPath: string,
  safeCwd: string,
): boolean {
  if (!input.codexPriorTouchedPaths?.length) return false;
  const canonicalTarget = canonicalizeTargetPathSync(safeCwd, targetPath);
  return input.codexPriorTouchedPaths.some(
    (priorPath) =>
      canonicalizeTargetPathSync(safeCwd, priorPath) === canonicalTarget,
  );
}

/** Convert an inexact contract-document projection into an actionable denial. */
function denyInexactContractMove(
  destinationPath: string,
  kind: 'stale-source' | 'ambiguous',
  hunkIndex: number,
): HookOutput {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `Cannot project Move destination ${destinationPath}: a contract document needs exact content; ` +
        `${kind} at hunk ${hunkIndex}. Edit the source first, ` +
        `then re-emit a bodyless Move. ${DENY_RETRY_GUIDANCE}`,
    },
  };
}

/** Convert an absent Move source into a path-specific hook denial. */
function denyMissingMoveSource(sourcePath: string): HookOutput {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `Cannot project Move source ${sourcePath}: it does not exist. ${DENY_RETRY_GUIDANCE}`,
    },
  };
}

/** Read a Move source again when a failed exact projection needs a superset. */
function readMoveSource(
  sourcePath: string,
  safeCwd: string,
): string | undefined {
  try {
    return readFileSync(resolve(safeCwd, sourcePath), 'utf-8');
  } catch {
    return undefined;
  }
}

/** Deny structure warnings only when they came from approximate Move content. */
function enforceApproximateStructureCheck(
  input: FilidPreToolUseInput,
  result: HookOutput,
): HookOutput {
  if (
    input.codexPatch?.projection !== 'approximate' ||
    !result.hookSpecificOutput?.additionalContext?.includes(
      '[filid:warn] structure-guard:',
    )
  )
    return result;
  return {
    ...result,
    hookSpecificOutput: {
      ...result.hookSpecificOutput,
      permissionDecision: 'deny',
      permissionDecisionReason:
        `Cannot allow an approximate Move projection while a structure risk remains. ` +
        DENY_RETRY_GUIDANCE,
    },
  };
}

/** Convert a stale disk projection into an actionable split-patch denial. */
function denyStalePatchTarget(targetPath: string): HookOutput {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `Cannot safely project ${targetPath} after an earlier patch operation touched it. ` +
        `Use separate apply_patch calls. ${DENY_RETRY_GUIDANCE}`,
    },
  };
}

/** Apply one conservative decision to every logical operation in a tool call. */
export async function handlePreToolUseBatch(
  normalized: NormalizeCodexToolUsesResult<PreToolUseInput>,
): Promise<HookOutput> {
  if (!normalized.ok) {
    const safeCwd = validateCwd(normalized.original.cwd);
    if (safeCwd === null || !isFcaProject(safeCwd)) return { continue: true };
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `Cannot inspect every apply_patch file operation: the patch envelope is malformed: ${normalized.reason}. ` +
          `Re-emit the patch in V4A form. ${DENY_RETRY_GUIDANCE}`,
      },
    };
  }

  if (normalized.original.tool_name !== 'apply_patch')
    return handlePreToolUse(normalized.toolUses[0]);

  const results: HookOutput[] = [];
  for (const toolUse of normalized.toolUses) {
    const result = await handlePreToolUse(toolUse);
    results.push(identifyPatchResult(result, toolUse));
  }
  return mergeResults(results);
}

function identifyPatchResult(
  result: HookOutput,
  input: PreToolUseInput,
): HookOutput {
  const output = result.hookSpecificOutput;
  if (!output) return result;
  const filePath = input.tool_input.file_path ?? input.tool_input.path ?? '';
  const marker = `[filid:apply_patch ${filePath}]`;
  return {
    ...result,
    hookSpecificOutput: {
      ...output,
      ...(output.permissionDecisionReason
        ? {
            permissionDecisionReason: `${marker}\n${output.permissionDecisionReason}`,
          }
        : {}),
      ...(output.additionalContext
        ? { additionalContext: `${marker}\n${output.additionalContext}` }
        : {}),
    },
  };
}
