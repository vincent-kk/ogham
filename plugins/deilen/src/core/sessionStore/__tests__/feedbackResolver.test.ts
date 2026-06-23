import { describe, expect, it } from "vitest";

import type { StoredFeedback } from "../../../types/feedback.js";
import {
  awaitFeedback,
  deliverComplete,
  settleAllResolvers,
} from "../resolver/feedbackResolver.js";

function fb(sessionId: string): StoredFeedback {
  return {
    session_id: sessionId,
    status: "complete",
    comments: [],
    images: [],
    updated_at: "now",
  };
}

describe("feedbackResolver", () => {
  it("rendezvous: deliverComplete wakes a waiter", async () => {
    const pending = awaitFeedback("a1", 5);
    deliverComplete("a1", fb("a1"));
    const result = await pending;
    expect(result.kind).toBe("complete");
    if (result.kind === "complete") {
      expect(result.feedback.session_id).toBe("a1");
    }
  });

  it("buffers a submission that arrives before collect", async () => {
    deliverComplete("a2", fb("a2"));
    expect((await awaitFeedback("a2", 5)).kind).toBe("complete");
  });

  it("times out to pending", async () => {
    expect((await awaitFeedback("a3", 0.05)).kind).toBe("pending");
  });

  it("supersedes an earlier waiter", async () => {
    const first = awaitFeedback("a4", 5);
    const second = awaitFeedback("a4", 5);
    expect((await first).kind).toBe("superseded");
    deliverComplete("a4", fb("a4"));
    expect((await second).kind).toBe("complete");
  });

  it("aborts on signal", async () => {
    const ctrl = new AbortController();
    const pending = awaitFeedback("a5", 5, ctrl.signal);
    ctrl.abort();
    expect((await pending).kind).toBe("aborted");
  });

  it("returns immediately when already aborted", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    expect((await awaitFeedback("a6", 5, ctrl.signal)).kind).toBe("aborted");
  });

  it("settleAllResolvers closes pending waiters", async () => {
    const pending = awaitFeedback("a7", 5);
    settleAllResolvers();
    expect((await pending).kind).toBe("closing");
  });

  it("is idempotent across repeated delivery", async () => {
    const pending = awaitFeedback("a8", 5);
    deliverComplete("a8", fb("a8"));
    deliverComplete("a8", fb("a8"));
    expect((await pending).kind).toBe("complete");
  });
});
