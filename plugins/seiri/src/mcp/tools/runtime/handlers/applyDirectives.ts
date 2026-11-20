import { lstatSync, rmSync } from 'node:fs';

import {
  canonicalizeTargetPathSync,
  portableIsAbsolute,
  portableJoin,
  projectRoot,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import { DIRECTIVES_CONTEXT_LIMIT } from '../../../../constants/directives.js';
import { DIRECTIVES_DIR, IGNORE_FILE } from '../../../../constants/files.js';
import { TASK_NAME_PATTERN } from '../../../../constants/gates.js';
import {
  readDirectiveBindings,
  summarizeDirectiveSet,
  updateDirectiveBinding,
} from '../../../../core/directives/index.js';
import { ensureSeiriDir, findRepoRoot } from '../../../../core/index.js';
import { loadIntervention } from '../../../../core/infra/configLoader/index.js';
import type {
  DirectiveBinding,
  DirectiveOperation,
  DirectiveScope,
  DirectiveSetSummary,
} from '../../../../types/directives.js';

/** Response to an explicit directive operation. */
export type DirectivesResult = DirectiveSetSummary &
  (
    | {
        status: 'dial_low';
        op: 'bind' | 'status';
        dial: 'off' | 'advisory';
        binding?: DirectiveBinding;
        warning?: string;
      }
    | {
        status: 'accepted';
        op: 'bind';
        scope: DirectiveScope;
        estimatedMode: 'inline' | 'pointer';
        warning?: string;
      }
    | {
        status: 'ok';
        op: 'on' | 'off' | 'status' | 'remove';
        binding?: DirectiveBinding;
      }
  );

/**
 * Manage a local directive set without deriving actor identity inside MCP.
 * @param workspace Absolute path inside the checkout that owns the set.
 * @param op Requested management operation, required.
 * @param set Kebab-case directive set name, required.
 * @param scope Binding audience, defaulting to the main actor's session.
 * @returns File summary, bind acceptance or dial warning, or the resulting binding state.
 * @throws For invalid requests or when a requested mutation cannot be applied.
 */
export function applyDirectives(
  workspace: string,
  op: DirectiveOperation | undefined,
  set: string | undefined,
  scope: DirectiveScope = 'session',
): DirectivesResult {
  if (
    !op ||
    !set ||
    !TASK_NAME_PATTERN.test(set) ||
    !portableIsAbsolute(workspace)
  )
    throw new Error(
      'directives requires an absolute project_root, a kebab-case set, and directives_op',
    );
  const suppliedRoot = projectRoot(workspace);
  const canonicalRoot = canonicalizeTargetPathSync(suppliedRoot, suppliedRoot);
  lstatSync(canonicalRoot);
  const root = findRepoRoot(canonicalRoot);
  const summary = summarizeDirectiveSet(root, set);
  if (!summary) throw new Error('Directive set does not exist');

  if (op === 'bind') {
    if (scope !== 'session' && scope !== 'all')
      throw new Error('Invalid directive scope');
    if (!summary.files.length)
      throw new Error('Cannot bind an empty directive set');
    return acceptBinding(root, summary, scope);
  }

  if (op === 'status') {
    const bindings = readDirectiveBindings(root);
    const binding = Object.hasOwn(bindings, set) ? bindings[set] : undefined;
    const dial = loadIntervention(root).effective;
    return dial === 'off' || dial === 'advisory'
      ? { ...summary, status: 'dial_low', op, dial, binding }
      : { ...summary, status: 'ok', op, binding };
  }

  const directory = ensureSeiriDir(root);
  let binding: DirectiveBinding | undefined;
  const updated = updateDirectiveBinding(root, set, (current) => {
    if (op === 'remove') {
      rmSync(resolveContainedPath(directory, DIRECTIVES_DIR, set), {
        recursive: true,
        force: true,
      });
      return undefined;
    }
    if (!current) throw new Error('Directive set has no binding');
    binding = { ...current, enabled: op === 'on' };
    return binding;
  });
  if (!updated)
    throw new Error('Directive set is unavailable or its binding lock is held');
  return { ...summary, status: 'ok', op, binding };
}

/**
 * Validate ignore coverage and report what the native bind hook can commit.
 * @param root Checkout that owns the directive files.
 * @param summary Validated nonempty set.
 * @param scope Requested audience.
 * @returns Acceptance or the effective low dial, plus a warning when needed.
 */
function acceptBinding(
  root: string,
  summary: DirectiveSetSummary,
  scope: DirectiveScope,
): DirectivesResult {
  const directory = ensureSeiriDir(root);
  const lines =
    readUtf8FileIfExistsSync(portableJoin(directory, IGNORE_FILE))?.split(
      /\r?\n/,
    ) ?? [];
  const excluded = lines.includes(`${DIRECTIVES_DIR}/`);
  const warning = excluded
    ? {}
    : {
        warning:
          'The seiri ignore file needs a directives/ rule to keep these files untracked.',
      };
  const dial = loadIntervention(root).effective;
  if (dial === 'off' || dial === 'advisory')
    return { ...summary, ...warning, status: 'dial_low', op: 'bind', dial };
  const estimatedMode =
    summary.bytes <= Math.min(...Object.values(DIRECTIVES_CONTEXT_LIMIT))
      ? 'inline'
      : 'pointer';
  return {
    ...summary,
    ...warning,
    status: 'accepted',
    op: 'bind',
    scope,
    estimatedMode,
  };
}
