import { describe, expect, it } from "vitest";

import { CancelStatus, JobStatus } from "../../../types/enums.js";
import { randomId } from "../../../utils/randomId.js";
import {
  cancelAllJobs,
  cancelJob,
  createJob,
  getJob,
  updateJob,
} from "../index.js";

function newJobId(): string {
  return randomId("jt_");
}

describe("jobStore", () => {
  it("registers a job in the queued state", () => {
    const jobId = newJobId();
    const job = createJob({
      jobId,
      workspaceId: "ws",
      controller: new AbortController(),
    });
    expect(job.status).toBe(JobStatus.Queued);
    expect(getJob(jobId)?.workspaceId).toBe("ws");
  });

  it("transitions status and attaches a result", () => {
    const jobId = newJobId();
    createJob({ jobId, workspaceId: "ws", controller: new AbortController() });
    updateJob(jobId, JobStatus.Running);
    expect(getJob(jobId)?.status).toBe(JobStatus.Running);
  });

  it("cancels a running job and aborts its controller", () => {
    const jobId = newJobId();
    const controller = new AbortController();
    createJob({ jobId, workspaceId: "ws", controller });
    updateJob(jobId, JobStatus.Running);
    expect(cancelJob(jobId)).toBe(CancelStatus.Cancelled);
    expect(controller.signal.aborted).toBe(true);
    expect(getJob(jobId)?.status).toBe(JobStatus.Cancelled);
  });

  it("reports already_finished and not_found", () => {
    const jobId = newJobId();
    createJob({ jobId, workspaceId: "ws", controller: new AbortController() });
    updateJob(jobId, JobStatus.Succeeded);
    expect(cancelJob(jobId)).toBe(CancelStatus.AlreadyFinished);
    expect(cancelJob("missing")).toBe(CancelStatus.NotFound);
  });

  it("cancelAllJobs aborts every live job", () => {
    const a = newJobId();
    const b = newJobId();
    const ca = new AbortController();
    const cb = new AbortController();
    createJob({ jobId: a, workspaceId: "ws", controller: ca });
    createJob({ jobId: b, workspaceId: "ws", controller: cb });
    updateJob(a, JobStatus.Running);
    updateJob(b, JobStatus.Running);
    cancelAllJobs();
    expect(ca.signal.aborted).toBe(true);
    expect(cb.signal.aborted).toBe(true);
  });
});
