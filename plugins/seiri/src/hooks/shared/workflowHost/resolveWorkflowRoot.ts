import { existsSync } from 'node:fs';

import { canonicalizeTargetPathSync } from '@ogham/cross-platform';

import { findRepoRoot } from '../../../core/utils/findRepoRoot.js';

/**
 * Resolve a native workspace to the repository that owns its workflow.
 * @param path Native workspace path, relative to the hook process when not absolute.
 * @returns The repository root of the existing physical path.
 * @throws When the workspace does not exist or cannot be resolved.
 */
export function resolveWorkflowRoot(path: string): string {
  const workspace = canonicalizeTargetPathSync('.', path);
  if (!existsSync(workspace))
    throw new Error('Workflow workspace does not exist');
  return findRepoRoot(workspace);
}
