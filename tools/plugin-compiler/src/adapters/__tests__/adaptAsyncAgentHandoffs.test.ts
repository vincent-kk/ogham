import { describe, expect, it } from "vitest";

import { adaptAsyncAgentLifecycle } from "../utils/adaptAsyncAgentLifecycle.js";

const HANDOFFS = `<!-- ogham-async-agent:handoffs filid -->
Claude completion return path.
<!-- ogham-async-agent:end -->`;

describe("persona-free handoff lifecycle", () => {
  it("selects a Codex loop without creating a persona dependency", () => {
    const result = adaptAsyncAgentLifecycle(
      HANDOFFS,
      "cross-review/SKILL.md",
      "filid",
    );
    expect(result?.personaFiles).toEqual([]);
    expect(result?.content).toContain("`spawn_agent`");
    expect(result?.content).toContain("`wait_agent`");
    expect(result?.content).not.toContain("Claude completion return path.");
  });

  it.each([
    ["duplicate block", `${HANDOFFS}\n${HANDOFFS}`],
    [
      "agent suffix",
      HANDOFFS.replace("handoffs filid", "handoffs filid:reviewer"),
    ],
    ["wrong plugin", HANDOFFS.replace("handoffs filid", "handoffs other")],
    ["missing end", HANDOFFS.replace("<!-- ogham-async-agent:end -->", "")],
    ["persona-free spawn", HANDOFFS.replace("handoffs filid", "spawn filid")],
  ])("rejects %s before emitting a partial variant", (_label, source) => {
    expect(() =>
      adaptAsyncAgentLifecycle(source, "cross-review/SKILL.md", "filid"),
    ).toThrow();
  });
});
