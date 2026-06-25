import type { JobRecord } from "../../../types/job.js";
import { JobRecordSchema } from "../../../types/job.js";
import { jobPath } from "../../../constants/paths.js";
import { readJson } from "../../../lib/fileIo.js";

/** Override for the registry file location (tests, reproducibility). */
export interface JobPathOptions {
  path?: string;
}

/**
 * Load a job record by id, validating it against the schema on read. A missing
 * file is a normal "unknown job" outcome (returns null) rather than an error;
 * any other I/O failure propagates so the caller can surface it.
 */
export async function getJob(
  jobId: string,
  options?: JobPathOptions,
): Promise<JobRecord | null> {
  try {
    return await readJson(options?.path ?? jobPath(jobId), JobRecordSchema);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
