// filid:contract AC-F7
// filid:contract AC-F8
// filid:contract AC-F13
// filid:contract AC-F14
// filid:contract AC-F15
import { describe, expect, it, vi } from "vitest";

import { SHA256_HEX_PATTERN } from "../../../constants/index.js";
import type {
  CommentProfile,
  FetchContext,
  McpResponse,
} from "../../../types/index.js";
import {
  probeCommentThread,
  readCommentThread,
  saveCommentThreadProfile,
  scanCommentThreads,
} from "../commentThread.js";
import type { CommentThreadDeps } from "../commentThread.js";
import { digestProposal } from "../operations/digestProposal.js";
import type { JiraChangelog, JiraComment } from "../operations/wire.js";
import { fakeRequest } from "./helpers/fakeRequest.js";
import type { FakeRoute } from "./helpers/fakeRequest.js";
import { loadFixture } from "./helpers/loadFixture.js";

const FIXED_NOW = new Date("2026-08-28T00:00:00.000Z");
const HOSTNAME = "jira.example.com";
const CTX: FetchContext = {
  http: { base_url: `https://${HOSTNAME}` },
  service: "jira",
  apiVersion: "2",
  requires_xsrf_bypass: true,
};

interface CommentFixture {
  comments: JiraComment[];
  changelog: JiraChangelog | null;
  issues?: Array<{ key: string; changelog: JiraChangelog }>;
}

function success(data: unknown): McpResponse {
  return { success: true, status: 200, data };
}

function failure(status: number): McpResponse {
  return {
    success: false,
    status,
    data: null,
    error: {
      code: `HTTP_${status}`,
      message: `HTTP ${status}`,
      retryable: status >= 500,
    },
  };
}

function profile(
  pattern: CommentProfile["pattern"] = "changelog",
  propertyKeys: string[] = ["replyplugin"],
): CommentProfile {
  return {
    pattern,
    propertyKeys,
    verifiedAt: "2026-08-01T00:00:00.000Z",
  };
}

function commentRoute(
  issue: string,
  comments: JiraComment[],
  total: number,
  startAt = 0,
  maxResults = 100,
): FakeRoute {
  return {
    method: "GET",
    endpoint: `/rest/api/2/issue/${issue}/comment`,
    query: { startAt: String(startAt), maxResults: String(maxResults) },
    response: success({ comments, total }),
  };
}

function changelogRoute(issue: string, changelog: JiraChangelog): FakeRoute {
  return {
    method: "GET",
    endpoint: `/rest/api/2/issue/${issue}`,
    query: { expand: "changelog", fields: "summary" },
    response: success({ changelog }),
  };
}

function setup(
  routes: FakeRoute[],
  profiles: Map<string, CommentProfile> = new Map(),
) {
  const fake = fakeRequest(routes);
  const saveProfile = vi.fn(async () => "/profiles/comment-profiles.json");
  const deps: CommentThreadDeps = {
    request: fake.request,
    loadProfiles: async () => ({ sites: profiles, warnings: [] }),
    saveProfile,
    now: () => new Date(FIXED_NOW),
  };
  return { fake, saveProfile, deps };
}

describe("readCommentThread", () => {
  it("returns only standard comments and a hint when no profile exists", async () => {
    const fixture = loadFixture<CommentFixture>("F8");
    const { deps, saveProfile } = setup([
      commentRoute("GCC-8", fixture.comments, fixture.comments.length),
    ]);

    const result = await readCommentThread(CTX, { issue_key: "GCC-8" }, deps);

    expect(result.thread.map((entry) => entry.id)).toEqual(["10001"]);
    expect(result.hint).toContain(`No reply-plugin profile for ${HOSTNAME}`);
    expect(result.hint).toContain('sample_issue_key "GCC-8"');
    expect(result.hint).toContain('"Thread clues"');
    expect(result.hint).not.toMatch(/Run the|call mode/);

    const empty = setup([commentRoute("GCC-8", [], 0)]);
    const emptyResult = await readCommentThread(
      CTX,
      { issue_key: "GCC-8" },
      empty.deps,
    );
    expect(emptyResult.thread).toEqual([]);
    expect(emptyResult.hint).toContain("Nothing to probe on GCC-8");
    expect(emptyResult.hint).not.toContain("sample_issue_key");
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("merges F1 and fetches the configured root property once", async () => {
    const fixture = loadFixture<CommentFixture>("F1");
    const propertyEndpoint = "/rest/api/2/comment/10001/properties/replyplugin";
    const { deps, fake } = setup(
      [
        commentRoute("GCC-1", fixture.comments, fixture.comments.length),
        changelogRoute("GCC-1", fixture.changelog!),
        {
          method: "GET",
          endpoint: propertyEndpoint,
          response: success({
            value: {
              parent_thread_id: 10001,
              deleted: false,
              last_thread_body: "reply two",
            },
          }),
        },
      ],
      new Map([[HOSTNAME, profile()]]),
    );

    const result = await readCommentThread(CTX, { issue_key: "GCC-1" }, deps);

    expect(result.thread[0]?.replies).toHaveLength(2);
    expect(
      fake.calls.filter((call) => call.endpoint === propertyEndpoint),
    ).toHaveLength(1);
  });

  it("pages through every standard comment", async () => {
    const comments = Array.from({ length: 150 }, (_, index) => ({
      id: String(index + 1),
      author: { displayName: "A" },
      created: `2026-08-01T00:${String(index % 60).padStart(2, "0")}:00.000Z`,
      body: `root ${index + 1}`,
    }));
    const { deps, fake } = setup(
      [
        commentRoute("GCC-150", comments.slice(0, 100), 150),
        commentRoute("GCC-150", comments.slice(100), 150, 100),
      ],
      new Map([[HOSTNAME, profile("standard", [])]]),
    );

    const result = await readCommentThread(CTX, { issue_key: "GCC-150" }, deps);

    expect(result.thread).toHaveLength(150);
    expect(
      fake.calls
        .filter((call) => call.endpoint.endsWith("/comment"))
        .map((call) => call.query_params?.startAt),
    ).toEqual(["0", "100"]);
  });

  it("keeps a single page partial without claiming outside roots are orphans", async () => {
    const changelog: JiraChangelog = {
      total: 1,
      histories: [
        {
          id: "50001",
          created: "2026-08-01T10:00:00.000Z",
          items: [{ field: "Comment", to: "100", toString: "outside" }],
        },
      ],
    };
    const { deps, fake } = setup(
      [
        commentRoute(
          "GCC-2",
          [
            {
              id: "200",
              created: "2026-08-01T11:00:00.000Z",
              body: "page root",
            },
          ],
          150,
          100,
          50,
        ),
        changelogRoute("GCC-2", changelog),
      ],
      new Map([[HOSTNAME, profile("changelog", [])]]),
    );

    const result = await readCommentThread(
      CTX,
      { issue_key: "GCC-2", start_at: 100 },
      deps,
    );

    expect(
      fake.calls.filter((call) => call.endpoint.endsWith("/comment")),
    ).toHaveLength(1);
    expect(result.thread.some((entry) => entry.orphan)).toBe(false);
    expect(result.warnings.join(" ")).toContain("outside this page");
  });

  it("degrades a changelog failure to unknown completeness", async () => {
    const comments: JiraComment[] = [
      { id: "1", created: "2026-08-01T00:00:00.000Z", body: "root" },
    ];
    const { deps } = setup(
      [
        commentRoute("GCC-3", comments, 1),
        {
          method: "GET",
          endpoint: "/rest/api/2/issue/GCC-3",
          response: failure(500),
        },
      ],
      new Map([[HOSTNAME, profile()]]),
    );

    const result = await readCommentThread(CTX, { issue_key: "GCC-3" }, deps);

    expect(result.complete).toBe("unknown");
    expect(result.thread).toHaveLength(1);
  });

  it("rejects when the standard comment API is forbidden", async () => {
    const { deps } = setup([
      {
        method: "GET",
        endpoint: "/rest/api/2/issue/GCC-4/comment",
        response: failure(403),
      },
    ]);

    await expect(
      readCommentThread(CTX, { issue_key: "GCC-4" }, deps),
    ).rejects.toThrow("failed");
  });

  it("degrades a property failure without nested annotation", async () => {
    const fixture = loadFixture<CommentFixture>("F1");
    const { deps } = setup(
      [
        commentRoute("GCC-5", fixture.comments, fixture.comments.length),
        changelogRoute("GCC-5", fixture.changelog!),
        {
          method: "GET",
          endpoint: "/rest/api/2/comment/10001/properties/replyplugin",
          response: failure(403),
        },
      ],
      new Map([[HOSTNAME, profile()]]),
    );

    const result = await readCommentThread(CTX, { issue_key: "GCC-5" }, deps);

    expect(result.warnings.join(" ")).toContain("unavailable");
    expect(result.thread[0]?.replies?.some((reply) => reply.nested)).toBe(
      false,
    );
  });

  it("does not request properties when the profile has no keys", async () => {
    const fixture = loadFixture<CommentFixture>("F1");
    const { deps, fake } = setup(
      [
        commentRoute("GCC-6", fixture.comments, fixture.comments.length),
        changelogRoute("GCC-6", fixture.changelog!),
      ],
      new Map([[HOSTNAME, profile("changelog", [])]]),
    );

    await readCommentThread(CTX, { issue_key: "GCC-6" }, deps);

    expect(
      fake.calls.some((call) => call.endpoint.includes("/properties/")),
    ).toBe(false);
  });

  it("does not mark replies beyond the 1000-comment cap as orphans", async () => {
    const comments = Array.from({ length: 1001 }, (_, index) => ({
      id: String(index + 1),
      created: `2026-08-01T00:00:${String(index % 60).padStart(2, "0")}.000Z`,
      body: `root ${index + 1}`,
    }));
    const commentPages = Array.from({ length: 10 }, (_, page) =>
      commentRoute(
        "GCC-1001",
        comments.slice(page * 100, (page + 1) * 100),
        comments.length,
        page * 100,
      ),
    );
    const changelog: JiraChangelog = {
      total: 1,
      histories: [
        {
          id: "90001",
          created: "2026-08-02T00:00:00.000Z",
          items: [{ field: "Comment", to: "1001", toString: "late reply" }],
        },
      ],
    };
    const { deps } = setup(
      [...commentPages, changelogRoute("GCC-1001", changelog)],
      new Map([[HOSTNAME, profile("changelog", [])]]),
    );

    const result = await readCommentThread(
      CTX,
      { issue_key: "GCC-1001" },
      deps,
    );

    expect(result.warnings.join(" ")).toContain("comment cap of 1000");
    expect(result.thread.some((entry) => entry.orphan)).toBe(false);
  });
});

describe("probeCommentThread", () => {
  it("proposes a changelog profile and records an unavailable paging endpoint", async () => {
    const fixture = loadFixture<CommentFixture>("F1");
    const { deps } = setup([
      commentRoute("GCC-7", fixture.comments, fixture.comments.length, 0, 50),
      changelogRoute("GCC-7", fixture.changelog!),
      {
        method: "GET",
        endpoint: "/rest/api/2/comment/10001/properties",
        response: success({ keys: [{ key: "replyplugin" }] }),
      },
    ]);

    const result = await probeCommentThread(
      CTX,
      { sample_issue_key: "GCC-7" },
      deps,
    );

    expect(result.proposal?.pattern).toBe("changelog");
    expect(result.proposal_digest).toMatch(SHA256_HEX_PATTERN);
    expect(result.evidence.changelogPagingEndpoint).toBe("unavailable");
  });

  it("reports property-key lookup failures in the probe rationale", async () => {
    const fixture = loadFixture<CommentFixture>("F1");
    fixture.changelog?.histories?.[0]?.items?.push({
      field: "Comment",
      to: null,
      toString: "malformed",
    });
    const { deps } = setup([
      commentRoute("GCC-9", fixture.comments, fixture.comments.length, 0, 50),
      changelogRoute("GCC-9", fixture.changelog!),
      {
        method: "GET",
        endpoint: "/rest/api/2/comment/10001/properties",
        response: failure(403),
      },
    ]);

    const result = await probeCommentThread(
      CTX,
      { sample_issue_key: "GCC-9" },
      deps,
    );

    expect(result.reason).toContain("property keys unavailable (HTTP 403)");
    expect(result.warnings.join(" ")).toContain(
      "property keys unavailable (HTTP 403)",
    );
    expect(result.warnings.join(" ")).toContain('unusable "to"');
  });
});

describe("saveCommentThreadProfile", () => {
  it("requires a matching digest only for a validated changelog profile", async () => {
    const proposed = profile();
    const { deps, saveProfile } = setup([]);

    await expect(
      saveCommentThreadProfile(
        CTX,
        { profile: proposed, proposal_digest: "wrong" },
        deps,
      ),
    ).rejects.toThrow("proposal_digest");

    const proposalDigest = digestProposal(HOSTNAME, proposed);
    await saveCommentThreadProfile(
      CTX,
      { profile: proposed, proposal_digest: proposalDigest },
      deps,
    );
    expect(saveProfile).toHaveBeenLastCalledWith(
      HOSTNAME,
      expect.objectContaining({ verifiedAt: FIXED_NOW.toISOString() }),
    );

    await saveCommentThreadProfile(
      CTX,
      { profile: profile("standard", []) },
      deps,
    );
    expect(saveProfile).toHaveBeenCalledTimes(2);

    await expect(
      saveCommentThreadProfile(
        CTX,
        { profile: { ...proposed, propertyKeys: ["../x"] } },
        deps,
      ),
    ).rejects.toThrow();
  });

  it("accepts a standard profile without verifiedAt and stamps the save time", async () => {
    const { deps, saveProfile } = setup([]);

    await saveCommentThreadProfile(
      CTX,
      {
        profile: {
          pattern: "standard",
          propertyKeys: [],
        },
      },
      deps,
    );

    expect(saveProfile).toHaveBeenCalledWith(HOSTNAME, {
      pattern: "standard",
      propertyKeys: [],
      verifiedAt: FIXED_NOW.toISOString(),
    });
  });
});

describe("scanCommentThreads", () => {
  it("reports only the F7 issue whose changelog contains Comment items", async () => {
    const fixture = loadFixture<CommentFixture>("F7");
    const { deps } = setup([
      {
        method: "GET",
        endpoint: "/rest/api/2/search",
        query: {
          jql: "project = GCC",
          startAt: "0",
          maxResults: "50",
          fields: "summary",
          expand: "changelog",
        },
        response: success({ issues: fixture.issues, total: 3 }),
      },
    ]);

    const result = await scanCommentThreads(
      CTX,
      { jql: "project = GCC" },
      deps,
    );

    expect(result.issues.map((issue) => issue.key)).toEqual(["GCC-2"]);
    expect(result.scanned).toBe(3);
    expect(result.complete).toBe(true);
  });

  it("marks a scan incomplete when an issue omits expanded changelog", async () => {
    const { deps } = setup([
      {
        method: "GET",
        endpoint: "/rest/api/2/search",
        query: {
          jql: "project = GCC",
          startAt: "0",
          maxResults: "50",
          fields: "summary",
          expand: "changelog",
        },
        response: success({ issues: [{ key: "GCC-404" }], total: 1 }),
      },
    ]);

    const result = await scanCommentThreads(
      CTX,
      { jql: "project = GCC" },
      deps,
    );

    expect(result.complete).toBe(false);
    expect(result.warnings.join(" ")).toContain("GCC-404: changelog missing");
  });
});
