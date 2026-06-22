import type { StoredFeedback } from "../../types/feedback.js";

export type SettleValue =
  | { kind: "complete"; feedback: StoredFeedback }
  | { kind: "pending" }
  | { kind: "superseded" }
  | { kind: "closing" }
  | { kind: "aborted" };

interface ResolverSlot {
  resolve: (value: SettleValue) => void;
  timer: ReturnType<typeof setTimeout>;
  signal?: AbortSignal;
  onAbort?: () => void;
}

// Process-global long-poll registry: one waiter slot per session plus a buffer
// for feedback submitted before its collect_feedback arrives. Every resolution
// path flows through the single idempotent `settle()` so timers and abort
// listeners are always paired with their clear.
const slots = new Map<string, ResolverSlot>();
const completeBuffer = new Map<string, StoredFeedback>();

function settle(sessionId: string, value: SettleValue): void {
  const slot = slots.get(sessionId);
  if (!slot) return;
  clearTimeout(slot.timer);
  if (slot.signal && slot.onAbort) {
    slot.signal.removeEventListener("abort", slot.onAbort);
  }
  slots.delete(sessionId);
  slot.resolve(value);
}

/** Wait up to waitSeconds for a complete submission for this session. */
export function awaitFeedback(
  sessionId: string,
  waitSeconds: number,
  signal?: AbortSignal,
): Promise<SettleValue> {
  const buffered = completeBuffer.get(sessionId);
  if (buffered) {
    completeBuffer.delete(sessionId);
    return Promise.resolve({ kind: "complete", feedback: buffered });
  }
  if (slots.has(sessionId)) settle(sessionId, { kind: "superseded" });

  return new Promise<SettleValue>((resolve) => {
    if (signal?.aborted) {
      resolve({ kind: "aborted" });
      return;
    }
    const timer = setTimeout(
      () => settle(sessionId, { kind: "pending" }),
      waitSeconds * 1000,
    );
    timer.unref();
    const onAbort = (): void => settle(sessionId, { kind: "aborted" });
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
    slots.set(sessionId, { resolve, timer, signal, onAbort });
  });
}

/** Deliver a complete submission: wake a waiter, or buffer for the next collect. */
export function deliverComplete(
  sessionId: string,
  feedback: StoredFeedback,
): void {
  if (slots.has(sessionId)) settle(sessionId, { kind: "complete", feedback });
  else completeBuffer.set(sessionId, feedback);
}

/** Settle a session's waiter as closing and drop any buffered feedback. */
export function closeResolver(sessionId: string): void {
  settle(sessionId, { kind: "closing" });
  completeBuffer.delete(sessionId);
}

/** Settle every waiter as closing (graceful shutdown). */
export function settleAllResolvers(): void {
  for (const sessionId of [...slots.keys()]) {
    settle(sessionId, { kind: "closing" });
  }
  completeBuffer.clear();
}
