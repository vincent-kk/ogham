// filid:contract AC-save-to-path
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleFetch } from "../mcp/tools/fetch/index.js";
import type { FetchContext, HttpClientConfig } from "../types/index.js";

// Mock executeRequest
vi.mock("../core/httpClient/index.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../core/httpClient/index.js")>();
  return {
    ...actual,
    executeRequest: vi.fn(),
  };
});

// Mock file-io
vi.mock("../lib/fileIo.js", () => ({
  writeBinary: vi.fn().mockResolvedValue(undefined),
  writeJson: vi.fn().mockResolvedValue(undefined),
}));

// Mock validateSavePath to return resolved path (skip cwd check in test)
vi.mock("../utils/index.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/index.js")>();
  return {
    ...actual,
    validateSavePath: vi.fn((p: string) => {
      if (p.includes(".."))
        throw new Error("Invalid save path: path traversal detected");
      return `/resolved${p.startsWith("/") ? "" : "/"}${p}`;
    }),
  };
});

const config: HttpClientConfig = {
  base_url: "https://test.atlassian.net",
  auth_header: "Bearer test",
};
const ctx: FetchContext = { http: config, service: "jira", apiVersion: "3" };

describe("fetch GET with save_to_path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("saves binary response to file and returns metadata", async () => {
    const { executeRequest } = await import("../core/httpClient/index.js");
    const { writeBinary } = await import("../lib/fileIo.js");
    const buffer = new ArrayBuffer(100);

    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: 200,
      data: { _binary: true, buffer, contentType: "image/png" },
    });

    const result = await handleFetch(
      {
        method: "GET",
        endpoint: "/rest/api/3/attachment/content/123",
        save_to_path: "/tmp/download.png",
      },
      ctx,
    );

    expect(writeBinary).toHaveBeenCalledWith(
      "/resolved/tmp/download.png",
      buffer,
    );
    expect(result.data).toEqual({
      saved_to: "/resolved/tmp/download.png",
      size_bytes: 100,
      content_type: "image/png",
    });
  });

  it("rejects save_to_path with path traversal", async () => {
    const { executeRequest } = await import("../core/httpClient/index.js");
    const buffer = new ArrayBuffer(10);

    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: 200,
      data: { _binary: true, buffer, contentType: "image/png" },
    });

    await expect(
      handleFetch(
        {
          method: "GET",
          endpoint: "/rest/api/3/attachment/content/123",
          save_to_path: "../../etc/passwd",
        },
        ctx,
      ),
    ).rejects.toThrow("path traversal");
  });

  it("writes a JSON response as pretty JSON and returns metadata", async () => {
    const { executeRequest } = await import("../core/httpClient/index.js");
    const { writeBinary, writeJson } = await import("../lib/fileIo.js");

    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: 200,
      data: { key: "TEST-1" },
    });
    vi.mocked(writeJson).mockResolvedValue(22);

    const result = await handleFetch(
      {
        method: "GET",
        endpoint: "/rest/api/3/issue/TEST-1",
        save_to_path: "/tmp/TEST-1.json",
      },
      ctx,
    );

    expect(executeRequest).toHaveBeenCalledWith(
      config,
      expect.objectContaining({ acceptBinary: true }),
    );
    expect(writeJson).toHaveBeenCalledWith("/resolved/tmp/TEST-1.json", {
      key: "TEST-1",
    });
    expect(writeBinary).not.toHaveBeenCalled();
    expect(result.data).toEqual({
      saved_to: "/resolved/tmp/TEST-1.json",
      size_bytes: 22,
      content_type: "application/json",
    });
  });

  it("converts ADF in a saved JSON response unless accept_format is raw", async () => {
    const { executeRequest } = await import("../core/httpClient/index.js");
    const { writeJson } = await import("../lib/fileIo.js");

    (executeRequest as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        success: true,
        status: 200,
        data: {
          description: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        status: 200,
        data: {
          description: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello" }],
              },
            ],
          },
        },
      });
    vi.mocked(writeJson).mockResolvedValue(1);

    await handleFetch(
      {
        method: "GET",
        endpoint: "/rest/api/3/issue/TEST-1",
        save_to_path: "/tmp/converted.json",
      },
      ctx,
    );
    await handleFetch(
      {
        method: "GET",
        endpoint: "/rest/api/3/issue/TEST-1",
        save_to_path: "/tmp/raw.json",
        accept_format: "raw",
      },
      ctx,
    );

    const convertedPayload = vi.mocked(writeJson).mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    const rawPayload = vi.mocked(writeJson).mock.calls[1]?.[1] as Record<
      string,
      unknown
    >;
    expect(convertedPayload.description_markdown).toBe("hello");
    expect(rawPayload).not.toHaveProperty("description_markdown");
  });

  it("writes a JSON null body as null instead of skipping the write", async () => {
    const { executeRequest } = await import("../core/httpClient/index.js");
    const { writeJson } = await import("../lib/fileIo.js");

    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: 200,
      data: null,
    });
    vi.mocked(writeJson).mockResolvedValue(5);

    const result = await handleFetch(
      {
        method: "GET",
        endpoint: "/rest/api/3/issue/TEST-1",
        save_to_path: "/tmp/null.json",
      },
      ctx,
    );

    expect(writeJson).toHaveBeenCalledWith("/resolved/tmp/null.json", null);
    expect(result.data).toEqual({
      saved_to: "/resolved/tmp/null.json",
      size_bytes: 5,
      content_type: "application/json",
    });
  });

  it("performs the request on every persisted GET without consulting the filesystem", async () => {
    const { executeRequest } = await import("../core/httpClient/index.js");
    const { writeBinary } = await import("../lib/fileIo.js");
    const buffer = new ArrayBuffer(64);

    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: 200,
      data: { _binary: true, buffer, contentType: "image/png" },
    });

    const result = await handleFetch(
      {
        method: "GET",
        endpoint: "/rest/api/3/attachment/content/456",
        save_to_path: "/tmp/image.png",
      },
      ctx,
    );

    expect(executeRequest).toHaveBeenCalled();
    expect(writeBinary).toHaveBeenCalled();
    expect((result.data as Record<string, unknown>).cached).toBeUndefined();
  });

  it("forwards expand as a query param on persisted GETs", async () => {
    const { executeRequest } = await import("../core/httpClient/index.js");
    const buffer = new ArrayBuffer(50);

    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: 200,
      data: { _binary: true, buffer, contentType: "video/mp4" },
    });

    await handleFetch(
      {
        method: "GET",
        endpoint: "/rest/api/3/attachment/content/789",
        save_to_path: "/tmp/demo.mp4",
        expand: ["renderedFields"],
      },
      ctx,
    );

    expect(executeRequest).toHaveBeenCalledWith(
      config,
      expect.objectContaining({
        query_params: { expand: "renderedFields" },
      }),
    );
  });

  it("returns the error envelope untouched and writes nothing when the request fails", async () => {
    const { executeRequest } = await import("../core/httpClient/index.js");
    const { writeBinary, writeJson } = await import("../lib/fileIo.js");
    const errorResponse = {
      success: false,
      status: 404,
      data: null,
      error: {
        code: "NOT_FOUND",
        message: "HTTP 404: Not Found",
        retryable: false,
      },
    };

    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue(
      errorResponse,
    );
    const expected = structuredClone(errorResponse);

    const result = await handleFetch(
      {
        method: "GET",
        endpoint: "/rest/api/3/issue/MISSING",
        save_to_path: "/tmp/missing.json",
      },
      ctx,
    );

    expect(writeBinary).not.toHaveBeenCalled();
    expect(writeJson).not.toHaveBeenCalled();
    expect(result).toEqual(expected);
  });

  it("still applies ADF conversion when no save_to_path", async () => {
    const { executeRequest } = await import("../core/httpClient/index.js");

    (executeRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      status: 200,
      data: {
        description: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "hello" }] },
          ],
        },
      },
    });

    const result = await handleFetch(
      {
        method: "GET",
        endpoint: "/rest/api/3/issue/TEST-1",
      },
      ctx,
    );

    const data = result.data as Record<string, unknown>;
    expect(data.description_markdown).toBe("hello");
  });
});
