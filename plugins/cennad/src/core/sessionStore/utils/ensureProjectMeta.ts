import { readFile } from 'node:fs/promises';

import { projectMetaPath } from '../../../constants/paths.js';
import { atomicWrite } from '../../../lib/atomicWrite.js';
import { logger } from '../../../lib/logger.js';
import { ProjectMetaSchema } from '../../../types/index.js';
import { isFileNotFound } from '../../../utils/isFileNotFound.js';

export async function ensureProjectMeta(
  projectHash: string,
  cwd: string,
  now: string,
): Promise<void> {
  const metaPath = projectMetaPath(projectHash);
  try {
    const text = await readFile(metaPath, 'utf8');
    const parsed = ProjectMetaSchema.safeParse(JSON.parse(text));
    if (parsed.success) {
      if (parsed.data.cwd !== cwd)
        logger.warn('project_hash collision', {
          project_hash: projectHash,
          existing_cwd: parsed.data.cwd,
          new_cwd: cwd,
        });

      return;
    }
    logger.warn('_meta.json invalid, overwriting', {
      project_hash: projectHash,
    });
  } catch (err) {
    if (!isFileNotFound(err))
      logger.warn('_meta.json unreadable, overwriting', {
        error: (err as Error).message,
      });
  }
  await atomicWrite(
    metaPath,
    `${JSON.stringify({ cwd, created_at: now }, null, 2)}\n`,
  );
}
