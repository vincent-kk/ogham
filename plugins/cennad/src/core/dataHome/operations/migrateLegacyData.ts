import { constants } from 'node:fs';
import { access, cp, lstat, mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  CENNAD_HOME,
  DIR_MODE,
  FILE_MODE,
  LEGACY_CENNAD_HOME,
} from '../../../constants/index.js';

const MIGRATION_MARKER = '.legacy-data-migrated';
const PERSISTENT_ENTRIES = [
  'config.json',
  'sessions',
  'artifacts',
  join('runtime', 'antigravity-cwd'),
  join('runtime', 'agy-models.json'),
] as const;

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function copyMissing(
  source: string,
  destination: string,
): Promise<boolean> {
  const sourceStat = await lstat(source);
  if (!sourceStat.isDirectory()) {
    if (await exists(destination)) return false;
    await mkdir(dirname(destination), { recursive: true, mode: DIR_MODE });
    try {
      await cp(source, destination, { errorOnExist: true, force: false });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
      throw error;
    }
  }

  await mkdir(destination, { recursive: true, mode: DIR_MODE });
  let copied = false;
  for (const child of await readdir(source)) {
    copied =
      (await copyMissing(join(source, child), join(destination, child))) ||
      copied;
  }
  return copied;
}

export interface LegacyDataMigrationOptions {
  legacyHome?: string;
  dataHome?: string;
}

export async function migrateLegacyData(
  options: LegacyDataMigrationOptions = {},
): Promise<boolean> {
  const legacyHome = options.legacyHome ?? LEGACY_CENNAD_HOME;
  const dataHome = options.dataHome ?? CENNAD_HOME;
  if (legacyHome === dataHome) return false;

  const marker = join(dataHome, MIGRATION_MARKER);
  if (await exists(marker)) return false;

  await mkdir(dataHome, { recursive: true, mode: DIR_MODE });
  let copied = false;
  for (const entry of PERSISTENT_ENTRIES) {
    const source = join(legacyHome, entry);
    const destination = join(dataHome, entry);
    if (!(await exists(source))) continue;
    copied = (await copyMissing(source, destination)) || copied;
  }

  await writeFile(marker, copied ? 'copied\n' : 'nothing-to-copy\n', {
    mode: FILE_MODE,
  });
  return copied;
}
