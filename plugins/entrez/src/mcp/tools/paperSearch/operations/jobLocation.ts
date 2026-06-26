import { join } from "node:path";

import { jobPath } from "../../../../constants/paths.js";

/** Options for async paper_search job operations. */
export interface JobRunOptions {
  /** Override job directory (tests); defaults to the plugin cache. */
  dir?: string;
  /** Await the search instead of running it in the background (tests). */
  awaitRun?: boolean;
}

const JSON_EXT = ".json";

/** Resolve the on-disk path for a job id (honoring a dir override). */
export function resolveJobPath(jobId: string, dir?: string): string {
  return dir ? join(dir, `${jobId}${JSON_EXT}`) : jobPath(jobId);
}
