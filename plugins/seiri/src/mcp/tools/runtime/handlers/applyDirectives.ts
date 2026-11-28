import { lstatSync, rmSync } from 'node:fs';

import {
  canonicalizeTargetPathSync,
  portableIsAbsolute,
  projectRoot,
  resolveContainedPath,
} from '@ogham/cross-platform';

import { DIRECTIVES_DIR } from '../../../../constants/files.js';
import { TASK_NAME_PATTERN } from '../../../../constants/gates.js';
import {
  inspectDirectiveSet,
  readDirectiveBindings,
  summarizeDirectiveSet,
  updateDirectiveBinding,
} from '../../../../core/directives/index.js';
import { ensureSeiriDir, findRepoRoot } from '../../../../core/index.js';
import { loadIntervention } from '../../../../core/infra/configLoader/index.js';
import type {
  DirectiveBinding,
  DirectiveLog,
  DirectiveOperation,
  DirectiveScope,
  DirectivesResult,
} from '../../../../types/directives.js';

import { acceptBinding } from './utils/acceptBinding.js';
import { appendRecord } from './utils/appendRecord.js';

/**
 * Manage a local directive set without deriving actor identity inside MCP.
 * @param workspace Absolute path inside the checkout that owns the set.
 * @param op Requested management operation, required.
 * @param set Kebab-case directive set name, required.
 * @param scope Binding audience, defaulting to the main actor's session.
 * @param log Record that `append` extends.
 * @param text Entry content for `append`.
 * @param now Clock value in epoch milliseconds, stamped on appended entries.
 * @returns File summary with the set inspection for bind and status, bind acceptance or dial warning, or the resulting binding state.
 * @throws For invalid requests or when a requested mutation cannot be applied.
 */
export function applyDirectives(
  workspace: string,
  op: DirectiveOperation | undefined,
  set: string | undefined,
  scope: DirectiveScope = 'session',
  log: DirectiveLog | undefined,
  text: string | undefined,
  now: number,
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
  const inspection = inspectDirectiveSet(root, set);
  if (!summary || !inspection) throw new Error('Directive set does not exist');

  if (op === 'bind') {
    if (scope !== 'session' && scope !== 'all')
      throw new Error('Invalid directive scope');
    if (!summary.files.length)
      throw new Error('Cannot bind an empty directive set');
    return acceptBinding(root, summary, inspection, scope);
  }

  if (op === 'append') return appendRecord(root, set, log, text, now);

  if (op === 'status') {
    const bindings = readDirectiveBindings(root);
    const binding = Object.hasOwn(bindings, set) ? bindings[set] : undefined;
    const dial = loadIntervention(root).effective;
    return dial === 'off' || dial === 'advisory'
      ? { ...summary, ...inspection, status: 'dial_low', op, dial, binding }
      : { ...summary, ...inspection, status: 'ok', op, binding };
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
