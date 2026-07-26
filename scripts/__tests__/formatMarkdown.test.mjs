import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatMarkdown } from "../formatMarkdown.mjs";

describe("formatMarkdown", () => {
  it("unwraps prose without changing Markdown block structure", () => {
    const source = [
      "---",
      "name: example",
      "---",
      "",
      "A paragraph wraps",
      "across lines.",
      "",
      "- A list item wraps",
      "  across lines.",
      "",
      "> A quote wraps",
      "> across lines.",
      ">",
      "> A separate quote paragraph.",
      "",
    ].join("\n");

    assert.equal(
      formatMarkdown(source),
      [
        "---",
        "name: example",
        "---",
        "",
        "A paragraph wraps across lines.",
        "",
        "- A list item wraps across lines.",
        "",
        "> A quote wraps across lines.",
        ">",
        "> A separate quote paragraph.",
        "",
      ].join("\n"),
    );
  });

  it("preserves fenced code, tables, HTML blocks, and hard breaks", () => {
    const source = [
      "```mermaid",
      "sequenceDiagram",
      "  A->>B: hello",
      "```",
      "",
      "| A | B |",
      "| - | - |",
      "| 1 | 2 |",
      "",
      "<!--",
      "line one",
      "line two",
      "-->",
      "",
      "Keep this hard break.  ",
      "Next line.",
      "",
    ].join("\n");

    assert.equal(formatMarkdown(source), source);
  });

  it("preserves callout markers on their own blockquote line", () => {
    const source = [
      "> [!NOTE]",
      "> Callout body wraps",
      "> across lines.",
      "",
    ].join("\n");

    assert.equal(
      formatMarkdown(source),
      ["> [!NOTE]", "> Callout body wraps across lines.", ""].join("\n"),
    );
  });

  it("unwraps soft breaks around an explicit hard break", () => {
    const source = [
      "Soft wrap",
      "before hard break.  ",
      "After hard break",
      "soft wrap.",
      "",
    ].join("\n");

    assert.equal(
      formatMarkdown(source),
      [
        "Soft wrap before hard break.  ",
        "After hard break soft wrap.",
        "",
      ].join("\n"),
    );
  });

  it("treats only an odd trailing backslash count as a hard break", () => {
    const source = [
      "Even slashes \\\\",
      "remain a soft wrap.",
      "",
      "Odd slash \\",
      "remains a hard break.",
      "",
    ].join("\n");

    assert.equal(
      formatMarkdown(source),
      [
        "Even slashes \\\\ remain a soft wrap.",
        "",
        "Odd slash \\",
        "remains a hard break.",
        "",
      ].join("\n"),
    );
  });
});
