import { readFile } from 'node:fs/promises';

import { COUNTER_PATH } from '../../constants/paths.js';
import { logger } from '../../lib/logger.js';
import { type Counter, CounterSchema } from '../../types/index.js';
import { isFileNotFound } from '../../utils/isFileNotFound.js';

export async function loadCounter(): Promise<Counter | null> {
  let raw: unknown;
  try {
    const text = await readFile(COUNTER_PATH, 'utf8');
    raw = JSON.parse(text);
  } catch (err) {
    if (isFileNotFound(err)) return null;
    logger.warn('counter.json unreadable', {
      error: (err as Error).message,
    });
    return null;
  }
  const parsed = CounterSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn('counter.json invalid', { issues: parsed.error.issues });
    return null;
  }
  return parsed.data;
}
