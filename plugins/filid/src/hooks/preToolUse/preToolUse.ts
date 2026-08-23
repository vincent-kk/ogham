import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type {
  NormalizedCodexToolUse,
  NormalizeCodexToolUsesResult,
} from '@ogham/cross-platform';

import {
  DENY_RETRY_GUIDANCE,
  HOOK_TOOL_NAME,
} from '../../constants/hookDefaults.js';
import type { HookOutput, PreToolUseInput } from '../../types/hooks.js';
import { isDetailMd } from '../shared/utils/isDetailMd.js';
import { isFcaProject } from '../shared/utils/isFcaProject.js';
import { validateCwd } from '../utils/validateCwd.js';

import { processVisit } from './helpers/intentInjector/intentInjector.js';
import {
  projectMoveContent,
  validatePreToolUse,
} from './helpers/preToolValidator/preToolValidator.js';
import { guardStructure } from './helpers/structureGuard/structureGuard.js';
import { mergeResults } from './utils/mergeResults.js';

/** Filid input after optional Codex normalization metadata is attached. */
type FilidPreToolUseInput = NormalizedCodexToolUse<PreToolUseInput>;

/**
 * Unified PreToolUse hook orchestrator.
 * Read | Write | Edit | Delete all enter the visit pipeline (`processVisit`)
 * first; mutations continue into their applicable validators and guards.
 *
 * FCA opt-in gate: projects without a `.filid/` marker or INTENT.md are not
 * governed at all — validation and guards are as opt-in as injection.
 *
 * A visit-gate deny (undelivered-module mutation) short-circuits the
 * orchestration: the deny reason already delivered the module rules, and the
 * identical retry runs the full validator/guard path.
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

  if (visit.hookSpecificOutput?.permissionDecision === 'deny')
    return mergeResults([visit]);

  const prepared = prepareMoveDestination(input, safeCwd);
  if (prepared === null)
    return mergeResults([
      visit,
      denyIndeterminateMove(input.codexPatch!.destinationPath),
    ]);
  const effectiveInput = prepared;
  const filePath =
    effectiveInput.tool_input.file_path ??
    effectiveInput.tool_input.path ??
    '';
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

  return mergeResults([
    visit,
    validatePreToolUse(effectiveInput, oldContent),
    guardStructure(effectiveInput),
  ]);
}

/** Prepare exact destination content for one normalized Move Write. */
function prepareMoveDestination(
  input: FilidPreToolUseInput,
  safeCwd: string,
): FilidPreToolUseInput | null {
  const move = input.codexPatch;
  if (!move || move.role !== 'destination') return input;
  const content = projectMoveContent(move, safeCwd);
  if (content === undefined) return null;
  return { ...input, tool_input: { ...input.tool_input, content } };
}

/** Convert an indeterminate Move projection into an actionable hook denial. */
function denyIndeterminateMove(destinationPath: string): HookOutput {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `Cannot project Move destination ${destinationPath}. Edit the source first, ` +
        `then re-emit a bodyless Move. ${DENY_RETRY_GUIDANCE}`,
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
