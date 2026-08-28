// filid:contract AC-F1
// filid:contract AC-F2
// filid:contract AC-F3
// filid:contract AC-F4
// filid:contract AC-F5
// filid:contract AC-F6
// filid:contract AC-F9
// filid:contract AC-F10
// filid:contract AC-F11
// filid:contract AC-F12
import { describe, expect, it } from "vitest";

import type { ProbeEvidence, ThreadEntry } from "../../../types/index.js";
import { detectTruncation } from "../operations/detectTruncation.js";
import { digestProposal } from "../operations/digestProposal.js";
import { extractChangelogReplies } from "../operations/extractChangelogReplies.js";
import { mergeCommentThread } from "../operations/mergeCommentThread.js";
import { parseReplyProperty } from "../operations/parseReplyProperty.js";
import { proposeProfile } from "../operations/proposeProfile.js";
import { runLimited } from "../operations/runLimited.js";
import { validateIssueKey } from "../operations/validateIssueKey.js";
import type {
  JiraChangelog,
  JiraComment,
  ReplyProperty,
} from "../operations/wire.js";
import { loadFixture } from "./helpers/loadFixture.js";

interface Fixture {
  comments: JiraComment[];
  changelog: JiraChangelog | null;
  properties: Record<string, ReplyProperty>;
  expect: Record<string, unknown>;
  issues?: Array<{ key: string; changelog: JiraChangelog }>;
  profile?: unknown;
}

function exercise(name: string) {
  const fixture = loadFixture<Fixture>(name);
  const extracted = extractChangelogReplies(fixture.changelog ?? undefined);
  const merged = mergeCommentThread(
    fixture.comments,
    extracted.replies,
    new Map(Object.entries(fixture.properties)),
  );
  return { fixture, extracted, merged };
}

function findEntry(thread: readonly ThreadEntry[], id: string) {
  return thread
    .flatMap((entry) => [entry, ...(entry.replies ?? [])])
    .find((entry) => entry.id === id);
}

describe("F1 — basic merge", () => {
  it("sorts two roots and two replies under their root", () => {
    const { fixture, extracted, merged } = exercise("F1");
    const expected = fixture.expect as {
      rootIds: string[];
      repliesOf: Record<string, string[]>;
      warnings: number;
    };

    expect(merged.thread.map((entry) => entry.id)).toEqual(expected.rootIds);
    for (const root of merged.thread)
      expect(root.replies?.map((reply) => reply.id)).toEqual(
        expected.repliesOf[root.id],
      );
    expect([...extracted.warnings, ...merged.warnings]).toHaveLength(
      expected.warnings,
    );
  });
});

describe("F2 — nested annotation", () => {
  it("marks the newest reply nested when the property parent differs", () => {
    const { fixture, merged } = exercise("F2");
    const expected = fixture.expect as { nestedId: string };

    expect(findEntry(merged.thread, expected.nestedId)?.nested).toBe(true);
  });
});

describe("F3 — unrelated changelog", () => {
  it("does not treat status or assignee changes as replies", () => {
    const { fixture, extracted } = exercise("F3");
    const expected = fixture.expect as { replyCount: number; warnings: number };

    expect(extracted.replies).toHaveLength(expected.replyCount);
    expect(extracted.warnings).toHaveLength(expected.warnings);
  });
});

describe("F4 — plugin absent", () => {
  it("returns standard roots without warnings", () => {
    const { fixture, merged } = exercise("F4");
    const expected = fixture.expect as { rootIds: string[]; warnings: number };

    expect(merged.thread.map((entry) => entry.id)).toEqual(expected.rootIds);
    expect(merged.warnings).toHaveLength(expected.warnings);
  });
});

describe("F5 — truncation", () => {
  it("reports how many changelog histories are missing", () => {
    const fixture = loadFixture<Fixture>("F5");
    const expected = fixture.expect as {
      truncation: ReturnType<typeof detectTruncation>;
    };

    expect(detectTruncation(fixture.changelog ?? undefined)).toEqual(
      expected.truncation,
    );
  });
});

describe("F6 — deleted annotation", () => {
  it("marks the newest matching reply deleted and nested", () => {
    const { fixture, merged } = exercise("F6");
    const expected = fixture.expect as { deletedId: string; nestedId: string };

    expect(findEntry(merged.thread, expected.deletedId)?.deleted).toBe(true);
    expect(findEntry(merged.thread, expected.nestedId)?.nested).toBe(true);
  });
});

describe("F7 — scan fixture", () => {
  it("contains one issue with Comment changes", () => {
    const fixture = loadFixture<Fixture>("F7");
    const expected = fixture.expect as { issueKeys: string[] };
    const issueKeys = fixture.issues
      ?.filter(
        (issue) => extractChangelogReplies(issue.changelog).replies.length > 0,
      )
      .map((issue) => issue.key);

    expect(issueKeys).toEqual(expected.issueKeys);
  });
});

describe("F8 — profile missing fixture", () => {
  it("preserves the standard thread for the no-profile path", () => {
    const { fixture, merged } = exercise("F8");
    const expected = fixture.expect as {
      rootIds: string[];
      profileMissing: boolean;
    };

    expect(fixture.profile === null).toBe(expected.profileMissing);
    expect(merged.thread.map((entry) => entry.id)).toEqual(expected.rootIds);
  });
});

describe("F9 — orphan", () => {
  it("appends an unknown-root reply as an orphan with one warning", () => {
    const { fixture, merged } = exercise("F9");
    const expected = fixture.expect as { orphanId: string; warnings: number };
    const orphan = merged.thread.at(-1);

    expect(orphan?.id).toBe(expected.orphanId);
    expect(orphan?.orphan).toBe(true);
    expect(merged.warnings).toHaveLength(expected.warnings);
  });
});

describe("F10 — suspected duplicate", () => {
  it("marks but retains the matching changelog reply", () => {
    const { fixture, extracted, merged } = exercise("F10");
    const expected = fixture.expect as {
      suspectedDuplicateId: string;
      replyCount: number;
    };

    expect(extracted.replies).toHaveLength(expected.replyCount);
    expect(
      findEntry(merged.thread, expected.suspectedDuplicateId)
        ?.suspectedDuplicate,
    ).toBe(true);
  });
});

describe("F11 — deterministic sorting", () => {
  it("sorts equal timestamps by id and assigns multi-item ids", () => {
    const { fixture, extracted, merged } = exercise("F11");
    const expected = fixture.expect as {
      orderedReplyIds: string[];
      multiIds: string[];
    };

    expect(merged.thread[0]?.replies?.map((reply) => reply.id)).toEqual(
      expected.orderedReplyIds,
    );
    expect(
      extracted.replies
        .filter((reply) => reply.id.startsWith("20020:"))
        .map((reply) => reply.id),
    ).toEqual(expected.multiIds);
  });
});

describe("F12 — malformed inputs", () => {
  it("warns for invalid targets and stale properties without annotating", () => {
    const { fixture, extracted, merged } = exercise("F12");
    const expected = fixture.expect as {
      extractionWarnings: number;
      truncationKnown: boolean;
      propertyWarnings: number;
      annotated: boolean;
    };
    const reply = findEntry(merged.thread, "20003");

    expect(extracted.warnings).toHaveLength(expected.extractionWarnings);
    expect(detectTruncation(fixture.changelog ?? undefined).known).toBe(
      expected.truncationKnown,
    );
    expect(merged.warnings).toHaveLength(expected.propertyWarnings);
    expect(Boolean(reply?.nested || reply?.deleted)).toBe(expected.annotated);
  });
});

describe("profile proposal helpers", () => {
  it("canonicalizes property keys and declines evidence without Comment items", () => {
    const first = digestProposal("h", {
      pattern: "changelog",
      propertyKeys: ["b", "a"],
    });
    const second = digestProposal("h", {
      pattern: "changelog",
      propertyKeys: ["a", "b"],
    });
    const evidence: ProbeEvidence = {
      sampleIssue: "GCC-12",
      standardTotal: 1,
      commentItems: 0,
      distinctRoots: 0,
      propertyKeys: [],
      changelogTruncated: false,
      changelogPagingEndpoint: "unknown",
    };

    expect(first).toBe(second);
    expect(proposeProfile(evidence, new Date(0)).proposal).toBeNull();
  });
});

describe("input helpers", () => {
  it("normalizes issue keys, rejects traversal, and parses reply properties", () => {
    expect(validateIssueKey("gcc-12")).toBe("GCC-12");
    expect(() => validateIssueKey("../x")).toThrow(
      "issue_key must look like PROJ-123",
    );
    expect(
      parseReplyProperty({
        parent_thread_id: "501",
        deleted: true,
        last_thread_body: "last",
      }),
    ).toEqual({ parentThreadId: "501", deleted: true, lastBody: "last" });
  });
});

describe("runLimited", () => {
  it("preserves order while keeping at most two tasks in flight", async () => {
    let active = 0;
    let maximum = 0;
    const tasks = Array.from({ length: 5 }, (_, index) => async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active -= 1;
      return index;
    });

    await expect(runLimited(tasks, 2)).resolves.toEqual([0, 1, 2, 3, 4]);
    expect(maximum).toBe(2);
  });
});
