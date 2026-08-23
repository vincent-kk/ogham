// filid:contract AC-getjob-readonly
import { describe, expect, it } from "vitest";

import { MANAGED_R_LIB_DIR } from "../../../../constants/paths.js";
import { createJob, updateJob } from "../../../../core/index.js";
import { Encoding, JobStatus, Platform } from "../../../../types/enums.js";
import { handleGetRJob } from "../getRJob.js";

describe("get_r_job managed library output", () => {
  it("keeps the runtime library while a job is running", async () => {
    const jobId = `job_path_${Date.now()}_running`;
    createJob({ jobId, workspaceId: "ws", controller: new AbortController() });
    updateJob(jobId, JobStatus.Running);

    await expect(handleGetRJob({ jobId })).resolves.toMatchObject({
      jobId,
      status: JobStatus.Running,
      managedLibraryPath: MANAGED_R_LIB_DIR,
    });
  });

  it("stripping streams never strips the runtime library", async () => {
    const jobId = `job_path_${Date.now()}_finished`;
    createJob({ jobId, workspaceId: "ws", controller: new AbortController() });
    updateJob(jobId, JobStatus.Succeeded, {
      exitCode: 0,
      stdout: {
        text: "visible",
        truncated: false,
        encodingUsed: Encoding.Utf8,
      },
      stderr: { text: "", truncated: false, encodingUsed: Encoding.Utf8 },
      artifacts: [],
      runtime: { rscriptPath: "Rscript", platform: Platform.Macos },
    });

    const output = await handleGetRJob({ jobId, includeStdout: false });
    expect(output.result?.stdout.text).toBe("");
    expect(output.managedLibraryPath).toBe(MANAGED_R_LIB_DIR);
  });
});
