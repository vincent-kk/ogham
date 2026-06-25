import { describe, expect, it } from "vitest";

import type { Comment, StoredFeedback } from "../../../../types/feedback.js";
import { buildFeedbackContent } from "../operations/buildFeedbackContent.js";

function feedback(overrides: Partial<StoredFeedback>): StoredFeedback {
  return {
    session_id: "rs_test",
    status: "complete",
    overall: [],
    comments: [],
    images: [],
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

async function textOf(stored: StoredFeedback): Promise<string> {
  const result = await buildFeedbackContent(stored.session_id, stored);
  const block = result.content.find((part) => part.type === "text");
  return block && "text" in block ? block.text : "";
}

const comment: Comment = {
  id: "c1",
  anchor: { startLine: 12, endLine: 14, sourceText: "the cache layer" },
  text: "tighten this",
  imageIds: [],
};

describe("buildFeedbackContent intent", () => {
  it("revise directs Claude to apply and re-display", async () => {
    const text = await textOf(
      feedback({ intent: "revise", comments: [comment] }),
    );
    expect(text).toContain("REVISIONS");
    expect(text).toContain("L12-14");
    expect(text).toContain("tighten this");
  });

  it("discuss directs Claude to continue the conversation", async () => {
    const text = await textOf(
      feedback({ intent: "discuss", comments: [comment] }),
    );
    expect(text).toContain("CONTINUE THE CONVERSATION");
    expect(text).not.toContain("REVISIONS");
  });

  it("dismiss reports the viewer was closed", async () => {
    const text = await textOf(feedback({ intent: "dismiss" }));
    expect(text).toContain("closed the viewer");
  });

  it("discuss with no comments tells Claude to continue with nothing", async () => {
    const text = await textOf(feedback({ intent: "discuss" }));
    expect(text).toContain("left no comments");
  });

  it("absent intent defaults to revise wording", async () => {
    const text = await textOf(feedback({ comments: [comment] }));
    expect(text).toContain("REVISIONS");
  });

  it("groups overall notes and comments under headings", async () => {
    const text = await textOf(
      feedback({
        intent: "revise",
        overall: [{ id: "o1", text: "make it shorter", imageIds: [] }],
        comments: [comment],
      }),
    );
    expect(text).toContain("Overall notes (1):");
    expect(text).toContain("make it shorter");
    expect(text).toContain("Comments (1):");
  });

  it("labels overall-note image attachments", async () => {
    const text = await textOf(
      feedback({
        intent: "discuss",
        overall: [{ id: "o1", text: "see screenshot", imageIds: ["abc123"] }],
      }),
    );
    expect(text).toContain("see screenshot [img_abc123]");
  });
});
