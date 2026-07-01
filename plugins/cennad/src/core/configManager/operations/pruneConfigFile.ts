import { readFile } from 'node:fs/promises';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { CONFIG_PATH } from '../../../constants/paths.js';
import { atomicWrite } from '../../../lib/atomicWrite.js';
import { logger } from '../../../lib/logger.js';
import { type Config, ConfigSchema } from '../../../types/index.js';
import { isFileNotFound } from '../../../utils/isFileNotFound.js';
import { deepEqual } from '../utils/deepEqual.js';
import { mergeWithDefaults } from '../utils/mergeWithDefaults.js';

export interface PruneResult {
  config: Config;
  pruned: boolean;
}

// Normalize the on-disk config and, when it differs from its current contents,
// rewrite it — dropping keys no longer in the schema (e.g. a removed provider),
// migrating legacy shapes, and filling missing defaults. Invoked when settings
// is opened so /setup leaves config.json at the current schema. Never throws: a
// missing, corrupt, or invalid file is left untouched and defaults are returned.
export async function pruneConfigFile(): Promise<PruneResult> {
  let rawText: string;
  try {
    rawText = await readFile(CONFIG_PATH, 'utf8');
  } catch (err) {
    if (isFileNotFound(err)) return { config: DEFAULT_CONFIG, pruned: false };
    logger.warn('config.json unreadable during prune, using defaults', {
      error: (err as Error).message,
    });
    return { config: DEFAULT_CONFIG, pruned: false };
  }

  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(rawText);
  } catch (err) {
    // Corrupt JSON — leave the file untouched rather than clobber user content.
    logger.warn('config.json is not valid JSON, leaving it untouched', {
      error: (err as Error).message,
    });
    return { config: DEFAULT_CONFIG, pruned: false };
  }

  const parsed = ConfigSchema.safeParse(mergeWithDefaults(rawParsed));
  if (!parsed.success) {
    logger.warn('config.json invalid during prune, leaving it untouched', {
      issues: parsed.error.issues,
    });
    return { config: DEFAULT_CONFIG, pruned: false };
  }

  const cleaned = parsed.data;
  if (deepEqual(cleaned, rawParsed)) return { config: cleaned, pruned: false };

  try {
    await atomicWrite(CONFIG_PATH, `${JSON.stringify(cleaned, null, 2)}\n`);
    return { config: cleaned, pruned: true };
  } catch (err) {
    logger.warn('failed to rewrite pruned config.json', {
      error: (err as Error).message,
    });
    return { config: cleaned, pruned: false };
  }
}
