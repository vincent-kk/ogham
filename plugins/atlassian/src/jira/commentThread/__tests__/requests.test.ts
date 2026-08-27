// filid:contract AC-F19
// filid:contract AC-F21
import { describe, expect, it } from "vitest";

import type { FetchContext, McpResponse } from "../../../types/index.js";
import { scanCommentThreads } from "../commentThread.js";
import { fetchAllComments } from "../requests/fetchAllComments.js";
import { fetchChangelog } from "../requests/fetchChangelog.js";
import { fetchCommentPage } from "../requests/fetchCommentPage.js";
import { fetchSearchPage } from "../requests/fetchSearchPage.js";
import { fakeRequest } from "./helpers/fakeRequest.js";
import type { FakeRoute } from "./helpers/fakeRequest.js";

const CONTEXT: FetchContext = {
  http: { base_url: "https://jira.example.com" },
  service: "jira",
  apiVersion: "2",
};

/** Build one successful fake transport envelope.
 * @param data Response body returned by the route.
 * @returns A successful MCP response.
 */
function success(data: unknown): McpResponse {
  return { success: true, status: 200, data };
}

/** Build deterministic standard comments.
 * @param start First numeric id.
 * @param count Number of comments to build.
 * @returns Valid Jira comment wire values.
 */
function comments(start: number, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(start + index),
    created: "2026-08-28T00:00:00.000Z",
    body: `comment ${start + index}`,
  }));
}

/** Build Jira search issues with an explicitly empty changelog.
 * @param start First issue number.
 * @param count Number of issues to build.
 * @returns Valid expanded-search issue values.
 */
function issues(start: number, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    key: `GCC-${start + index}`,
    changelog: { total: 0, histories: [] },
  }));
}

describe("effective pagination", () => {
  it("advances comment offsets by the number Jira actually returns", async () => {
    const routes: FakeRoute[] = [0, 50, 100].map((startAt, page) => ({
      method: "GET",
      endpoint: "/rest/api/2/issue/GCC-120/comment",
      query: { startAt: String(startAt), maxResults: "100" },
      response: success({
        comments: comments(startAt + 1, page === 2 ? 20 : 50),
        total: 120,
      }),
    }));
    const fake = fakeRequest(routes);

    const result = await fetchAllComments(CONTEXT, fake.request, "GCC-120");

    expect(result.comments).toHaveLength(120);
    expect(fake.calls.map((call) => call.query_params?.startAt)).toEqual([
      "0",
      "50",
      "100",
    ]);
    expect(result.complete).toBe(true);
  });

  it("advances scan offsets by the number Jira actually returns", async () => {
    const routes: FakeRoute[] = [0, 20, 40].map((startAt) => ({
      method: "GET",
      endpoint: "/rest/api/2/search",
      query: { startAt: String(startAt), maxResults: "50" },
      response: success({ issues: issues(startAt + 1, 20), total: 60 }),
    }));
    const fake = fakeRequest(routes);

    const result = await scanCommentThreads(
      CONTEXT,
      { jql: "project = GCC" },
      {
        request: fake.request,
        loadProfiles: async () => ({ sites: new Map(), warnings: [] }),
        saveProfile: async () => "unused",
        now: () => new Date("2026-08-28T00:00:00.000Z"),
      },
    );

    expect(result.scanned).toBe(60);
    expect(fake.calls.map((call) => call.query_params?.startAt)).toEqual([
      "0",
      "20",
      "40",
    ]);
    expect(result.complete).toBe(true);
  });
});

describe("successful response validation", () => {
  it("rejects a malformed comment page explicitly", async () => {
    const fake = fakeRequest([
      {
        method: "GET",
        endpoint: "/rest/api/2/issue/GCC-1/comment",
        response: success({ comments: "not-an-array", total: 1 }),
      },
    ]);

    await expect(
      fetchCommentPage(CONTEXT, fake.request, "GCC-1", 0, 100),
    ).rejects.toThrow("malformed comment page");
  });

  it("rejects a malformed search page explicitly", async () => {
    const fake = fakeRequest([
      {
        method: "GET",
        endpoint: "/rest/api/2/search",
        response: success({ issues: {}, total: 1 }),
      },
    ]);

    await expect(
      fetchSearchPage(CONTEXT, fake.request, "project = GCC", 0, 50),
    ).rejects.toThrow("malformed search page");
  });

  it("degrades a malformed changelog to a warning", async () => {
    const fake = fakeRequest([
      {
        method: "GET",
        endpoint: "/rest/api/2/issue/GCC-1",
        response: success({ changelog: "not-an-object" }),
      },
    ]);

    const result = await fetchChangelog(CONTEXT, fake.request, "GCC-1");

    expect(result.changelog).toBeNull();
    expect(result.warning).toContain("malformed changelog");
  });
});
