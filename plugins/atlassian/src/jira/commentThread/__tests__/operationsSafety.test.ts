// filid:contract AC-F16
// filid:contract AC-F17
// filid:contract AC-F18
// filid:contract AC-F20
import { describe, expect, it } from "vitest";

import {
  CommentProfileSchema,
  type ProbeEvidence,
  type ThreadEntry,
} from "../../../types/index.js";
import { applyReplyProperty } from "../operations/applyReplyProperty.js";
import { compareEntries } from "../operations/compareEntries.js";
import { extractChangelogReplies } from "../operations/extractChangelogReplies.js";
import { parseReplyProperty } from "../operations/parseReplyProperty.js";
import { proposeProfile } from "../operations/proposeProfile.js";

const CREATED = "2026-08-28T00:00:00.000Z";

describe("reply property safety", () => {
  it("does not annotate without a matching last_thread_body", () => {
    const reply: ThreadEntry = {
      id: "200",
      kind: "reply",
      parentId: "100",
      author: "A",
      created: CREATED,
      body: "latest reply",
      source: "changelog",
    };
    const root: ThreadEntry = {
      id: "100",
      kind: "comment",
      author: "A",
      created: CREATED,
      body: "root",
      source: "standard",
      replies: [reply],
    };

    const warning = applyReplyProperty(root, {
      parentThreadId: "999",
      deleted: true,
      lastBody: null,
    });

    expect(warning).toContain("last_thread_body");
    expect(reply.nested).toBeUndefined();
    expect(reply.deleted).toBeUndefined();
  });

  it("rejects coercible or unsafe parent_thread_id values", () => {
    for (const value of [null, "", false, true, Number.MAX_SAFE_INTEGER + 1])
      expect(parseReplyProperty({ parent_thread_id: value })).toEqual({
        parentThreadId: null,
        deleted: false,
        lastBody: null,
      });

    expect(parseReplyProperty({ parent_thread_id: 501 })?.parentThreadId).toBe(
      "501",
    );
    expect(
      parseReplyProperty({ parent_thread_id: "501" })?.parentThreadId,
    ).toBe("501");
  });

  it("preserves large digit strings and rejects invalid numeric targets", () => {
    const largeRoot = "9007199254740993";
    const largeParent = "9007199254740994";
    const property = parseReplyProperty({
      parent_thread_id: largeParent,
      last_thread_body: "latest",
    });
    expect(property?.parentThreadId).toBe(largeParent);

    const reply: ThreadEntry = {
      id: "2",
      kind: "reply",
      parentId: largeRoot,
      author: "A",
      created: CREATED,
      body: "latest",
      source: "changelog",
    };
    const root: ThreadEntry = {
      id: largeRoot,
      kind: "comment",
      author: "A",
      created: CREATED,
      body: "root",
      source: "standard",
      replies: [reply],
    };
    applyReplyProperty(root, property!);
    expect(reply.nested).toBe(true);

    const extracted = extractChangelogReplies({
      histories: [
        {
          id: "10",
          created: CREATED,
          items: [
            { field: "Comment", to: -1, toString: null },
            { field: "Comment", to: 1.5, toString: null },
            {
              field: "Comment",
              to: Number.MAX_SAFE_INTEGER + 1,
              toString: null,
            },
            { field: "Comment", to: largeRoot, toString: null },
          ],
        },
      ],
    });
    expect(extracted.replies.map((item) => item.rootId)).toEqual([largeRoot]);
    expect(extracted.warnings).toHaveLength(3);
  });
});

describe("large numeric id ordering", () => {
  it("orders digit strings beyond Number.MAX_SAFE_INTEGER exactly", () => {
    const lower = { created: CREATED, id: "9007199254740992" };
    const higher = { created: CREATED, id: "9007199254740993" };

    expect(compareEntries(lower, higher)).toBeLessThan(0);
    expect(compareEntries(higher, lower)).toBeGreaterThan(0);
  });
});

describe("profile proposal safety", () => {
  it("returns a deterministic proposal accepted by the save schema", () => {
    const evidence: ProbeEvidence = {
      sampleIssue: "GCC-1",
      standardTotal: 1,
      commentItems: 1,
      distinctRoots: 1,
      propertyKeys: [
        "reply key",
        ...Array.from({ length: 10 }, (_, index) => `reply.key.${index}`),
      ],
      changelogTruncated: false,
      changelogPagingEndpoint: "unavailable",
    };

    const result = proposeProfile(evidence, new Date(CREATED));

    expect(CommentProfileSchema.safeParse(result.proposal).success).toBe(true);
    expect(result.proposal?.propertyKeys).toHaveLength(8);
    expect(result.proposal?.propertyKeys).not.toContain("reply key");
    expect(result.reason).toContain("ignored");
  });
});
