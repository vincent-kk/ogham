import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeBinary, writeJson } from "../lib/fileIo.js";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  chmod: vi.fn().mockResolvedValue(undefined),
}));

describe("writeBinary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates parent directories and writes binary data", async () => {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const buffer = new ArrayBuffer(4);
    new Uint8Array(buffer).set([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes

    await writeBinary("/tmp/test/output.png", buffer);

    expect(mkdir).toHaveBeenCalledWith("/tmp/test", { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(
      "/tmp/test/output.png",
      Buffer.from(buffer),
    );
  });

  it("passes ArrayBuffer through Buffer.from correctly", async () => {
    const { writeFile } = await import("node:fs/promises");
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const buffer = data.buffer as ArrayBuffer;

    await writeBinary("/tmp/data.bin", buffer);

    const writtenData = (writeFile as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as Buffer;
    expect(writtenData).toEqual(Buffer.from([1, 2, 3, 4, 5]));
  });
});

describe("writeJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes pretty JSON with a trailing newline and returns the byte length", async () => {
    const { mkdir, writeFile } = await import("node:fs/promises");

    const bytes = await writeJson("/tmp/test/TEST-1.json", { key: "TEST-1" });

    expect(mkdir).toHaveBeenCalledWith("/tmp/test", { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(
      "/tmp/test/TEST-1.json",
      '{\n  "key": "TEST-1"\n}\n',
      { encoding: "utf-8" },
    );
    expect(bytes).toBe(22);
  });

  it("passes mode to writeFile and repairs permissions with chmod", async () => {
    const { writeFile, chmod } = await import("node:fs/promises");

    await writeJson("/tmp/secret.json", { token: "x" }, { mode: 0o600 });

    expect(writeFile).toHaveBeenCalledWith(
      "/tmp/secret.json",
      expect.any(String),
      { encoding: "utf-8", mode: 0o600 },
    );
    expect(chmod).toHaveBeenCalledWith("/tmp/secret.json", 0o600);
  });
});
