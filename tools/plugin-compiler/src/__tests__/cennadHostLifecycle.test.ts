import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const CENNAD_ROOT = join(REPOSITORY_ROOT, "plugins/cennad");

function readSkill(root: string, provider: string): string {
  return readFileSync(join(root, provider, "SKILL.md"), "utf8");
}

describe("cennad host lifecycle surfaces", () => {
  it.each(["antigravity", "codex", "claude"])(
    "keeps %s Claude-native and makes its Codex variant explicitly join",
    (provider) => {
      const claude = readSkill(join(CENNAD_ROOT, "skills"), provider);
      const codex = readSkill(
        join(CENNAD_ROOT, ".codex-plugin/skills"),
        provider,
      );

      expect(claude).toContain("completion notification re-invokes you");
      expect(claude).not.toContain("`wait_agent`");
      expect(codex).toContain("`spawn_agent`");
      expect(codex).toContain("`wait_agent`");
      expect(codex).toContain("next mailbox update");
      expect(codex).toContain("belongs to the recorded child target");
      expect(codex).toContain("does not re-invoke");
      expect(codex).toContain("Relay the report:");
      expect(codex).toContain("## Stop");
      expect(codex).not.toContain("completion notification re-invokes you");
      expect(codex).not.toContain("no need to leave Claude");
      expect(codex).not.toContain("ogham-async-agent:");
    },
  );

  it("uses host-neutral plugin metadata for Claude and Codex", () => {
    const claudeManifest = readFileSync(
      join(CENNAD_ROOT, ".claude-plugin/plugin.json"),
      "utf8",
    );
    const codexManifest = readFileSync(
      join(CENNAD_ROOT, ".codex-plugin/plugin.json"),
      "utf8",
    );

    expect(claudeManifest).not.toContain("from Claude Code via");
    expect(codexManifest).not.toContain("from Claude Code via");
  });
});
