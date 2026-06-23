import { describe, expect, it } from "vitest";

import { renderMarkdown } from "../operations/renderMarkdown.js";

describe("renderMarkdown", () => {
  it("renders a GFM table", () => {
    const { html } = renderMarkdown("| a | b |\n| - | - |\n| 1 | 2 |");
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
  });

  it("emits code fence with data-lang and leaves highlighting to the client", () => {
    const { html } = renderMarkdown("```js\nconst x = 1;\n```");
    expect(html).toContain('data-lang="js"');
    expect(html).toContain('class="language-js"');
    expect(html).toContain("const x = 1;");
  });

  it("extracts the first H1 as title", () => {
    expect(renderMarkdown("# Hello World\n\ntext").title).toBe("Hello World");
  });

  it("marks mermaid fences for client rendering without producing svg", () => {
    const { html } = renderMarkdown("```mermaid\ngraph TD; A-->B;\n```");
    expect(html).toContain('class="deilen-mermaid"');
    expect(html).toContain("graph TD");
    expect(html).not.toContain("<svg");
  });

  it("marks inline math", () => {
    const { html } = renderMarkdown("Euler: $e^{i\\pi}+1=0$ done");
    expect(html).toContain('class="deilen-math" data-display="0"');
    expect(html).toContain("e^{i\\pi}+1=0");
  });

  it("marks display math", () => {
    const { html } = renderMarkdown("$$\n\\int_0^1 x dx\n$$");
    expect(html).toContain('data-display="1"');
    expect(html).toContain("\\int_0^1 x dx");
  });

  it("renders task list items as checkbox markers", () => {
    const { html } = renderMarkdown("- [x] done\n- [ ] todo");
    expect(html).toContain('class="deilen-task-item checked"');
    expect(html).toContain('class="deilen-task-checkbox checked"');
    expect(html).toContain('class="deilen-task-item"');
    expect(html).not.toContain("[x]");
    expect(html).not.toContain("[ ]");
  });

  it("injects data-source-line on block elements", () => {
    const { html } = renderMarkdown("# Title\n\nparagraph here");
    expect(html).toMatch(/<h1[^>]*data-source-line="1"/);
    expect(html).toMatch(/<p[^>]*data-source-line="3"/);
  });

  it("reports source line index and line count", () => {
    const { sourceLineIndex, lineCount } = renderMarkdown(
      "# A\n\npara\n\n- item",
    );
    expect(lineCount).toBe(5);
    expect(sourceLineIndex[0]).toEqual({ startLine: 1, endLine: 1 });
  });

  it("does not treat currency as math", () => {
    expect(renderMarkdown("It costs $5 and $6 total").html).not.toContain(
      "deilen-math",
    );
  });

  it("escapes code content", () => {
    const { html } = renderMarkdown("```html\n<script>x</script>\n```");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>x");
  });

  it("returns empty title when there is no H1", () => {
    expect(renderMarkdown("## sub only").title).toBe("");
  });

  it("handles empty input", () => {
    const { html, lineCount, title } = renderMarkdown("");
    expect(html).toBe("");
    expect(lineCount).toBe(0);
    expect(title).toBe("");
  });
});
