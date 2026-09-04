import { describe, expect, it } from "vitest";

import { adaptAsyncAgentLifecycle } from "../utils/adaptAsyncAgentLifecycle.js";

const LIFECYCLE = `# Run

<!-- ogham-async-agent:spawn cennad:courier -->
CLAUDE SPAWN ONLY
<!-- ogham-async-agent:end -->

shared prompt

# Deliver

<!-- ogham-async-agent:join cennad:courier -->
CLAUDE JOIN ONLY
<!-- ogham-async-agent:end -->

shared relay
`;

describe("adaptAsyncAgentLifecycle", () => {
  // --- basic ---

  it("returns null when a skill has no explicit lifecycle marker", () => {
    expect(
      adaptAsyncAgentLifecycle("plain skill", "plain/SKILL.md", "cennad"),
    ).toBeNull();
  });

  it("replaces Claude lifecycle blocks with Codex spawn and join semantics", () => {
    const adapted = adaptAsyncAgentLifecycle(
      LIFECYCLE,
      "antigravity/SKILL.md",
      "cennad",
    );

    expect(adapted?.content).toContain("`spawn_agent`");
    expect(adapted?.content).toContain("`wait_agent`");
    expect(adapted?.content).toContain("next mailbox update");
    expect(adapted?.content).toContain("belongs to the recorded child target");
    expect(adapted?.content).toContain("useful independent work");
    expect(adapted?.content).toContain("does not re-invoke");
    expect(adapted?.content).toContain("`../.shared/personas/courier.md`");
    expect(adapted?.content).not.toContain("CLAUDE SPAWN ONLY");
    expect(adapted?.content).not.toContain("CLAUDE JOIN ONLY");
    expect(adapted?.content).not.toContain("ogham-async-agent:");
    expect(adapted?.content).toContain("shared prompt");
    expect(adapted?.content).toContain("shared relay");
    expect(adapted?.personaFiles).toEqual(["courier.md"]);
  });

  // --- complex ---

  it("computes the persona path from the marked skill depth", () => {
    expect(
      adaptAsyncAgentLifecycle(LIFECYCLE, "a/references/workflow.md", "cennad")
        ?.content,
    ).toContain("`../../.shared/personas/courier.md`");
  });

  it("renders another plugin role without cennad-specific wording", () => {
    const adapted = adaptAsyncAgentLifecycle(
      LIFECYCLE.replaceAll("cennad:courier", "review-kit:arbiter"),
      "review/SKILL.md",
      "review-kit",
    );

    expect(adapted?.content).toContain("`review-kit:arbiter`");
    expect(adapted?.content).toContain("`../.shared/personas/arbiter.md`");
    expect(adapted?.content.toLowerCase()).not.toContain("courier");
  });

  it("fails closed when spawn and join are not a complete pair", () => {
    const incomplete = LIFECYCLE.replace(
      /<!-- ogham-async-agent:join[\s\S]*?<!-- ogham-async-agent:end -->\n/,
      "",
    );
    expect(() =>
      adaptAsyncAgentLifecycle(incomplete, "antigravity/SKILL.md", "cennad"),
    ).toThrow(/one spawn and one join/);
  });

  it("fails closed when join appears before spawn", () => {
    const reversed = `<!-- ogham-async-agent:join cennad:courier -->
Claude join
<!-- ogham-async-agent:end -->
<!-- ogham-async-agent:spawn cennad:courier -->
Claude spawn
<!-- ogham-async-agent:end -->`;
    expect(() =>
      adaptAsyncAgentLifecycle(reversed, "antigravity/SKILL.md", "cennad"),
    ).toThrow(/in that order/);
  });

  it("fails closed when a marker names another plugin", () => {
    expect(() =>
      adaptAsyncAgentLifecycle(
        LIFECYCLE.replaceAll("cennad:courier", "other:courier"),
        "antigravity/SKILL.md",
        "cennad",
      ),
    ).toThrow(/plugin cennad/);
  });

  it("fails closed when marker delimiters are malformed", () => {
    expect(() =>
      adaptAsyncAgentLifecycle(
        LIFECYCLE.replace("<!-- ogham-async-agent:end -->", ""),
        "antigravity/SKILL.md",
        "cennad",
      ),
    ).toThrow(/malformed/);
  });
});
