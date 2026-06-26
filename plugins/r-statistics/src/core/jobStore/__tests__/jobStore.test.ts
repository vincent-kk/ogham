import { describe, expect, it } from "vitest";

import { MAX_TRACKED_JOBS } from "../../../constants/defaults.js";
import { CancelStatus, JobStatus } from "../../../types/enums.js";
import { randomId } from "../../../utils/randomId.js";
import {
  cancelAllJobs,
  cancelJob,
  createJob,
  getJob,
  hasActiveWorkspaceJob,
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

  it("evicts oldest terminal jobs past the cap, preserving in-flight", () => {
    const liveId = newJobId();
    createJob({
      jobId: liveId,
      workspaceId: "ws",
      controller: new AbortController(),
    });
    updateJob(liveId, JobStatus.Running);
    const firstTerminal = newJobId();
    createJob({
      jobId: firstTerminal,
      workspaceId: "ws",
      controller: new AbortController(),
    });
    updateJob(firstTerminal, JobStatus.Succeeded);
    for (let i = 0; i < MAX_TRACKED_JOBS + 5; i += 1) {
      const id = newJobId();
      createJob({
        jobId: id,
        workspaceId: "ws",
        controller: new AbortController(),
      });
      updateJob(id, JobStatus.Succeeded);
    }
    expect(getJob(firstTerminal)).toBeUndefined();
    expect(getJob(liveId)?.status).toBe(JobStatus.Running);
  });

  it("detects an active job on a workspace", () => {
    const jobId = newJobId();
    const ws = `wsbusy_${jobId}`;
    createJob({ jobId, workspaceId: ws, controller: new AbortController() });
    updateJob(jobId, JobStatus.Running);
    expect(hasActiveWorkspaceJob(ws)).toBe(true);
    updateJob(jobId, JobStatus.Succeeded);
    expect(hasActiveWorkspaceJob(ws)).toBe(false);
  });
});
