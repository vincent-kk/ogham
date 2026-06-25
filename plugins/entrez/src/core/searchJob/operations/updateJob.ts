import type { JobRecord } from "../../../types/job.js";
import { JobRecordSchema } from "../../../types/job.js";
import { jobPath } from "../../../constants/paths.js";
import { Messages } from "../../../constants/messages.js";
import { writeJson } from "../../../lib/fileIo.js";
import { isoNow } from "../../../utils/isoNow.js";
import { getJob } from "./getJob.js";

/** Override for the injectable clock and registry file location. */
export interface UpdateJobOptions {
  nowMs?: number;
  path?: string;
}

/**
 * Apply a partial patch to an existing job (status transition, progress, result,
 * error). `jobId` is pinned to the stored value and `updatedAt` is always
 * refreshed, so neither can be overwritten by the patch. Re-validated and
 * re-persisted 0o600.
 */
export async function updateJob(
  jobId: string,
  patch: Partial<JobRecord>,
  options?: UpdateJobOptions,
): Promise<JobRecord> {
  const existing = await getJob(jobId, { path: options?.path });
  if (existing === null) throw new Error(Messages.JOB_NOT_FOUND);

  const merged = JobRecordSchema.parse({
    ...existing,
    ...patch,
    jobId: existing.jobId,
    updatedAt: isoNow(options?.nowMs),
  });

  await writeJson(options?.path ?? jobPath(jobId), merged, { mode: 0o600 });
  return merged;
}
