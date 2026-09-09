import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildCodexPluginManifest,
  buildCodexSkills,
} from "../adapters/index.js";
import { readSkillFiles } from "../facts/read/readSkillFiles.js";
import type { PluginFacts } from "../types/index.js";

const FILID_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../plugins/filid",
);

describe("filid host lifecycle surfaces", () => {
  it("routes Codex to a complete handoff variant without changing Claude's workflow", () => {
    const skillFiles = readSkillFiles(FILID_ROOT);
    const original = structuredClone(skillFiles);
    const facts: PluginFacts = {
      directory: FILID_ROOT,
      name: "filid",
      manifest: { name: "filid" },
      hasSkills: true,
      hasHooks: false,
      hooksFile: null,
      mcpServers: null,
      agentFiles: {},
      skillFiles,
    };

    const files = buildCodexSkills(facts);
    expect(files).not.toBeNull();
    expect(buildCodexPluginManifest(facts).skills).toBe(
      "./.codex-plugin/skills/",
    );
    expect(skillFiles).toEqual(original);
    const claude = original["cross-review/SKILL.md"];
    const codex = files!.find((file) =>
      file.relativePath.endsWith("/cross-review/SKILL.md"),
    )!.content;
    expect(claude).toContain(
      "end the turn and wait for its completion notification",
    );
    expect(claude).not.toContain("`wait_agent`");
    expect(codex).toContain("`wait_agent`");
    expect(codex).not.toContain(
      "end the turn and wait for its completion notification",
    );
    expect(codex).not.toContain("never spawn a second child");
    expect(codex).not.toContain("ogham-async-agent:");

    // Everything outside the host paragraph, including validation/retry/seal,
    // is the exact canonical workflow; all sibling references travel with it.
    const stripHost = (text: string) =>
      text.replace(
        /<!-- (?:ogham|codex)-async-agent:handoffs[^\n]*-->\r?\n[\s\S]*?<!-- (?:ogham|codex)-async-agent:end -->/,
        "",
      );
    expect(stripHost(codex)).toBe(stripHost(claude));
    expect(files!.map((file) => file.relativePath)).toEqual(
      Object.keys(original)
        .sort()
        .map((path) => `.codex-plugin/skills/${path}`),
    );
    for (const file of files!) {
      const path = file.relativePath.slice(".codex-plugin/skills/".length);
      if (path !== "cross-review/SKILL.md")
        expect(file.content).toBe(original[path]);
    }
    expect(buildCodexSkills(facts)).toEqual(files);
  });
});
