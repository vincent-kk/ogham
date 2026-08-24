import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatSkillFrontmatter } from "../formatSkillFrontmatter.mjs";

describe("formatSkillFrontmatter", () => {
  it("orders known keys while preserving extra blocks and the skill body", () => {
    const source = `---
plugin: example
description: |
  First line.
  Second line.
orchestrator:
  - delegate
context_layers:
  - intent
name: sample
complexity: moderate
version: '1.0.0'
argument-hint: '[path]'
disable-model-invocation: true
user-invocable: false
---

# Sample

Body text stays byte-identical.
`;
    const expected = `---
name: sample
user-invocable: false
disable-model-invocation: true
description: |
  First line.
  Second line.
argument-hint: '[path]'
version: '1.0.0'
complexity: moderate
orchestrator:
  - delegate
context_layers:
  - intent
plugin: example
---

# Sample

Body text stays byte-identical.
`;

    assert.equal(formatSkillFrontmatter(source), expected);
    assert.equal(formatSkillFrontmatter(expected), expected);
  });
});
