import { describe, expect, it } from "vitest";

import type { RuleActionFacts } from "../planning/decideRuleAction.js";
import { decideRuleAction } from "../planning/decideRuleAction.js";

describe("rule action facts", () => {
  it.each<{
    name: string;
    facts: RuleActionFacts;
    action: string;
  }>([
    {
      name: "absent and undesired",
      facts: {
        desired: false,
        deployed: false,
        contentAvailable: true,
        matches: false,
        replaceDrift: false,
      },
      action: "unchanged",
    },
    {
      name: "deployed and undesired",
      facts: {
        desired: false,
        deployed: true,
        contentAvailable: true,
        matches: false,
        replaceDrift: false,
      },
      action: "remove",
    },
    {
      name: "absent and desired",
      facts: {
        desired: true,
        deployed: false,
        contentAvailable: true,
        matches: false,
        replaceDrift: false,
      },
      action: "copy",
    },
    {
      name: "matching and desired",
      facts: {
        desired: true,
        deployed: true,
        contentAvailable: true,
        matches: true,
        replaceDrift: false,
      },
      action: "unchanged",
    },
    {
      name: "drift without replacement",
      facts: {
        desired: true,
        deployed: true,
        contentAvailable: true,
        matches: false,
        replaceDrift: false,
      },
      action: "drift",
    },
    {
      name: "drift with replacement",
      facts: {
        desired: true,
        deployed: true,
        contentAvailable: true,
        matches: false,
        replaceDrift: true,
      },
      action: "update",
    },
  ])("maps $name to $action", ({ facts, action }) => {
    expect(decideRuleAction(facts).action).toBe(action);
  });

  it("skips a desired document whose template content is unavailable", () => {
    expect(
      decideRuleAction({
        desired: true,
        deployed: true,
        contentAvailable: false,
        matches: false,
        replaceDrift: true,
      }),
    ).toMatchObject({
      action: "skip",
      reason: expect.stringContaining("content"),
    });
  });

  it("still removes an undesired document when template content is unavailable", () => {
    expect(
      decideRuleAction({
        desired: false,
        deployed: true,
        contentAvailable: false,
        matches: false,
        replaceDrift: false,
      }),
    ).toEqual({ action: "remove" });
  });
});
