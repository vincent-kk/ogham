import { lstatSync } from 'node:fs';

import {
  portableIsAbsolute,
  readUtf8FileIfExistsSync,
} from '@ogham/cross-platform';

import type { DirectiveBinding } from '../../../types/directives.js';

/**
 * Load and validate a binding record without following links.
 * @param path Path to a binding record in a validated directive directory.
 * @returns The record if it is readable and has the supported shape.
 */
export function readDirectiveBinding(
  path: string,
): DirectiveBinding | undefined {
  if (!lstatSync(path, { throwIfNoEntry: false })?.isFile()) return undefined;
  const content = readUtf8FileIfExistsSync(path);
  if (content === null) return undefined;
  try {
    const binding: Partial<DirectiveBinding> | null = JSON.parse(content);
    if (!binding) return undefined;
    const { root, enabled, boundAt, lastInjectedAt, scope, actor } = binding;
    if (
      typeof root !== 'string' ||
      !portableIsAbsolute(root) ||
      typeof enabled !== 'boolean' ||
      typeof boundAt !== 'number' ||
      !Number.isFinite(boundAt) ||
      (lastInjectedAt !== undefined && !Number.isFinite(lastInjectedAt)) ||
      (scope !== 'session' && scope !== 'all') ||
      (scope === 'session'
        ? typeof actor !== 'string' || !actor
        : actor !== undefined)
    )
      return undefined;
    return { ...binding, root, enabled, boundAt, scope };
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}
