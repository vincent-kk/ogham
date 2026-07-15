import { describe, expect, it } from "vitest";

import { normalizeCodexToolUse } from "../normalizeToolUse.js";
import { parseBashRead } from "../parseBashRead.js";

describe("parseBashRead", () => {
  it("extracts the path from a bare cat", () => {
    expect(parseBashRead("cat 01_Core/identity.md")).toBe("01_Core/identity.md");
  });

  it("skips leading flags and flag values (head -n 50 file)", () => {
    expect(parseBashRead("head -n 50 notes.md")).toBe("notes.md");
    expect(parseBashRead("tail -20 log.md")).toBe("log.md");
  });

  it("resolves a reader given by absolute path (/bin/cat)", () => {
    expect(parseBashRead("/usr/bin/cat readme.md")).toBe("readme.md");
  });

  it("returns null for a non-reader command", () => {
    expect(parseBashRead("ls -la 01_Core")).toBeNull();
    expect(parseBashRead("grep foo notes.md")).toBeNull();
  });

  it("returns null when metacharacters make it more than a single read", () => {
    expect(parseBashRead("cat notes.md | grep x")).toBeNull();
    expect(parseBashRead("echo hi > notes.md")).toBeNull();
    expect(parseBashRead("cat a.md && cat b.md")).toBeNull();
    expect(parseBashRead("cat *.md")).toBeNull();
  });

  it("returns null when there is no file token (reads stdin)", () => {
    expect(parseBashRead("cat")).toBeNull();
    expect(parseBashRead("head -n 50")).toBeNull();
  });
});

describe("normalizeCodexToolUse — Bash reads", () => {
  it("rewrites a simple shell read to Read with file_path", () => {
    const out = normalizeCodexToolUse({
      tool_name: "Bash",
      tool_input: { command: "cat 01_Core/identity.md" },
    });
    expect(out.tool_name).toBe("Read");
    expect(out.tool_input.file_path).toBe("01_Core/identity.md");
  });

  it("leaves a non-read or complex Bash command as Bash", () => {
    const piped = {
      tool_name: "Bash",
      tool_input: { command: "cat notes.md | head" },
    };
    expect(normalizeCodexToolUse(piped)).toBe(piped);
    const write = {
      tool_name: "Bash",
      tool_input: { command: "printf x >> notes.md" },
    };
    expect(normalizeCodexToolUse(write)).toBe(write);
  });

  it("preserves sibling fields and cwd when promoting to Read", () => {
    const out = normalizeCodexToolUse({
      cwd: "/vault",
      tool_name: "Bash",
      tool_input: { command: "cat a.md", justification: "keep" },
    });
    expect(out.cwd).toBe("/vault");
    expect(out.tool_input.justification).toBe("keep");
  });
});
