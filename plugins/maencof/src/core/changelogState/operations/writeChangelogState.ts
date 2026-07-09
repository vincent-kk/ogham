/**
 * @file writeChangelogState.ts
 * @description changelog-state.json 쓰기.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { ChangelogState } from '../../../types/changelog.js';

import { changelogStatePath } from './changelogStatePath.js';

export function writeChangelogState(cwd: string, state: ChangelogState): void {
  const filePath = changelogStatePath(cwd);
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(state), 'utf-8');
}
