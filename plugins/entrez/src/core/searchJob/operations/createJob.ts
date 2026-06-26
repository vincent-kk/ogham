import type { JobRecord } from "../../../types/job.js";
import { JobRecordSchema } from "../../../types/job.js";
import { JobStatus } from "../../../types/enums.js";
import { jobPath } from "../../../constants/paths.js";
import { writeJson } from "../../../lib/fileIo.js";
import { isoNow } from "../../../utils/isoNow.js";
import { randomId } from "../../../utils/randomId.js";

/** Overrides for deterministic ids/clock/path (tests, reproducibility). */
export interface CreateJobOptions {
  id?: string;
  nowMs?: number;
  path?: string;
}

/**
 * Register a new async search job in the disk registry. The job is born in
 * QUEUED state with `createdAt === updatedAt`; the worker advances it later via
 * `updateJob`. Validated with zod before write and persisted 0o600 because the
 * stored `input` may echo user query terms.
 */
export async function createJob(
  input: unknown,
  options?: CreateJobOptions,
): Promise<JobRecord> {
  const jobId = options?.id ?? randomId();
  const ts = isoNow(options?.nowMs);

  const record = JobRecordSchema.parse({
    jobId,
    status: JobStatus.QUEUED,
    createdAt: ts,
    updatedAt: ts,
    input,
  });

  await writeJson(options?.path ?? jobPath(jobId), record, { mode: 0o600 });
  return record;
}
