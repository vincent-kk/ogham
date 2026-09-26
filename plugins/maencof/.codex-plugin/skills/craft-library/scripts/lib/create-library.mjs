import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { assertManagerTargetAvailable } from './assert-manager-target-available.mjs';
import { copyMissingFiles } from './copy-missing-files.mjs';
import { resolveManagerTarget } from './resolve-manager-target.mjs';

/**
 * Scaffold missing library files and refresh only a generated management skill.
 * @param {string} vaultRoot absolute vault root
 * @param {'codex' | 'claude'} host current coding-agent host
 * @param {string} libraryTemplate absolute library template directory
 * @param {string} managerTemplate absolute manager template directory
 * @returns {{host: string, operation: string, libraryPath: string, skillPath: string}} setup result
 */
export function createLibrary(
  vaultRoot,
  host,
  libraryTemplate,
  managerTemplate,
) {
  const managerTarget = resolveManagerTarget(vaultRoot, host);
  assertManagerTargetAvailable(managerTarget);

  const libraryRoot = join(vaultRoot, 'library');
  const operation = existsSync(join(libraryRoot, 'index.html'))
    ? 'updated'
    : 'created';
  copyMissingFiles(libraryTemplate, libraryRoot);
  mkdirSync(dirname(managerTarget), { recursive: true });
  cpSync(managerTemplate, managerTarget, { recursive: true, force: true });
  return {
    host,
    operation,
    libraryPath: 'library/index.html',
    skillPath: relative(vaultRoot, managerTarget).split(sep).join('/'),
  };
}
