import fs from 'node:fs/promises';
import path from 'node:path';

import type { CheckpointStatus } from '../../../../types/review.js';
import { MAX_RESUME_RETRIES } from '../../../../types/review.js';
import type { ReviewManageInput } from '../review-manage.js';
import { normalizeBranch } from '../utils/review-utils.js';

export async function handleCheckpoint(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (!input.branchName) {
    throw new Error('branchName is required for checkpoint action');
  }
  const normalized = normalizeBranch(input.branchName);
  const reviewDir = path.join(
    input.projectRoot,
    '.filid',
    'review',
    normalized,
  );

  let dirEntries: string[] = [];
  try {
    dirEntries = await fs.readdir(reviewDir);
  } catch {
    // directory missing — treat as empty
  }
  const checkFiles = new Set([
    'structure-check.md',
    'session.md',
    'verification.md',
    'review-report.md',
  ]);
  const existingFiles = dirEntries.filter((f) => checkFiles.has(f));

  const hasStructureCheck = existingFiles.includes('structure-check.md');
  const hasSession = existingFiles.includes('session.md');
  const hasVerification = existingFiles.includes('verification.md');
  const hasReport = existingFiles.includes('review-report.md');

  // Parse session.md frontmatter once for no_structure_check + resume_attempts.
  let noStructureCheck = false;
  let resumeAttempts = 0;
  if (hasSession) {
    const sessionPath = path.join(reviewDir, 'session.md');
    try {
      const content = await fs.readFile(sessionPath, 'utf-8');
      noStructureCheck = /^no_structure_check:\s*(true)/m.test(content);
      const attemptsMatch = content.match(/^resume_attempts:\s*(\d+)/m);
      if (attemptsMatch) {
        resumeAttempts = Number.parseInt(attemptsMatch[1], 10);
      }
    } catch {
      // read error — treat flags as absent
    }
  }

  let phase: CheckpointStatus['phase'];
  if (!hasStructureCheck && !hasSession) {
    phase = 'A';
  } else if (!hasSession) {
    phase = 'B';
  } else if (!hasStructureCheck && hasSession && !hasVerification) {
    // session.md only: C if Phase A was intentionally skipped, else restart A.
    // Skill must increment resume_attempts and honor resumeExhausted.
    phase = noStructureCheck ? 'C' : 'A';
  } else if (!hasVerification) {
    phase = 'C';
  } else if (!hasReport) {
    phase = 'D';
  } else {
    phase = 'DONE';
  }

  const result: CheckpointStatus = {
    phase,
    files: existingFiles,
    resumeAttempts,
    resumeExhausted: resumeAttempts >= MAX_RESUME_RETRIES,
  };
  return result as unknown as Record<string, unknown>;
}
