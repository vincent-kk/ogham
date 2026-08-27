// filid:contract AC-adapter-thin
// filid:contract AC-cloud-rejected
// filid:contract AC-mode-schema
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../jira/index.js", () => ({
  probeCommentThread: vi.fn(),
  readCommentThread: vi.fn(),
  saveCommentThreadProfile: vi.fn(),
  scanCommentThreads: vi.fn(),
}));

import { MCP_TOOL_NAMES } from "../../../../constants/index.js";
import {
  probeCommentThread,
  readCommentThread,
  saveCommentThreadProfile,
  scanCommentThreads,
} from "../../../../jira/index.js";
import {
  JiraCommentThreadInputSchema,
  type CommentProfile,
  type FetchContext,
} from "../../../../types/index.js";
import { handleJiraCommentThread } from "../jiraCommentThread.js";

const SERVER_CONTEXT: FetchContext = {
  http: { base_url: "https://jira.example.com" },
  service: "jira",
  apiVersion: "2",
  requires_xsrf_bypass: true,
  is_cloud: false,
};

const mockProbeCommentThread = vi.mocked(probeCommentThread);
const mockReadCommentThread = vi.mocked(readCommentThread);
const mockSaveCommentThreadProfile = vi.mocked(saveCommentThreadProfile);
const mockScanCommentThreads = vi.mocked(scanCommentThreads);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleJiraCommentThread", () => {
  it("validates each mode's required and exclusive input fields", () => {
    const invalid = [
      {},
      { mode: "scan" },
      { mode: "probe" },
      { mode: "save_profile" },
      { mode: "probe", sample_issue_key: "GCC-1", jql: "project = GCC" },
    ];
    const valid = [
      { issue_key: "GCC-1" },
      { mode: "read", issue_key: "GCC-1" },
      { mode: "scan", jql: "project = GCC" },
      { mode: "probe", sample_issue_key: "GCC-1" },
      {
        mode: "save_profile",
        profile: { pattern: "standard", propertyKeys: [] },
      },
    ];

    for (const input of invalid)
      expect(JiraCommentThreadInputSchema.safeParse(input).success).toBe(false);
    for (const input of valid)
      expect(JiraCommentThreadInputSchema.safeParse(input).success).toBe(true);
  });

  it("dispatches the default mode to read", async () => {
    mockReadCommentThread.mockResolvedValue({
      issue: "GCC-1",
      thread: [],
      warnings: [],
      complete: true,
      profile: null,
    });

    await handleJiraCommentThread({ issue_key: "GCC-1" }, SERVER_CONTEXT);

    expect(mockReadCommentThread).toHaveBeenCalledWith(SERVER_CONTEXT, {
      issue_key: "GCC-1",
      start_at: undefined,
      max_results: undefined,
      expand: undefined,
    });
  });

  it("rejects Cloud before any recipe is called", async () => {
    await expect(
      handleJiraCommentThread(
        { issue_key: "GCC-1" },
        { ...SERVER_CONTEXT, is_cloud: true },
      ),
    ).rejects.toThrow("Server/Data Center sites only");

    expect(mockReadCommentThread).not.toHaveBeenCalled();
    expect(mockScanCommentThreads).not.toHaveBeenCalled();
    expect(mockProbeCommentThread).not.toHaveBeenCalled();
    expect(mockSaveCommentThreadProfile).not.toHaveBeenCalled();
  });

  it("requires jql in scan mode", async () => {
    await expect(
      Reflect.apply(handleJiraCommentThread, undefined, [
        { mode: "scan" },
        SERVER_CONTEXT,
      ]),
    ).rejects.toThrow("jql is required");
  });

  it("forwards a save profile and proposal digest", async () => {
    const profile: CommentProfile = {
      pattern: "changelog",
      propertyKeys: ["replyplugin"],
      verifiedAt: "2026-08-28T00:00:00.000Z",
    };
    mockSaveCommentThreadProfile.mockResolvedValue({
      saved: true,
      path: "/profiles/comment-profiles.json",
      hostname: "jira.example.com",
    });

    await handleJiraCommentThread(
      {
        mode: "save_profile",
        profile,
        proposal_digest: "digest",
      },
      SERVER_CONTEXT,
    );

    expect(mockSaveCommentThreadProfile).toHaveBeenCalledWith(SERVER_CONTEXT, {
      profile,
      proposal_digest: "digest",
    });
  });

  it("registers jira_comment_thread as the fifth tool name", () => {
    expect(MCP_TOOL_NAMES).toHaveLength(5);
    expect(MCP_TOOL_NAMES).toContain("jira_comment_thread");
  });
});
