import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MANAGED_MARKER = '<!-- managed by maencof craft-library -->';

/**
 * Prevent setup from replacing a same-named user-owned local skill.
 * @param {string} target absolute local skill directory
 * @returns {void}
 */
export function assertManagerTargetAvailable(target) {
  if (!existsSync(target)) return;
  const entries = readdirSync(target);
  if (entries.length === 0) return;
  const skillPath = join(target, 'SKILL.md');
  const managed =
    existsSync(skillPath) &&
    readFileSync(skillPath, 'utf8').includes(MANAGED_MARKER);
  if (!managed)
    throw new Error(`Refusing to overwrite user-owned skill: ${target}`);
}
