import { describe, expect, it } from "vitest";

import { renderMarkdown } from "../operations/renderMarkdown.js";

describe("renderMarkdown rawHtml", () => {
  it("renders a details block with a line anchor on its first tag", () => {
    const markdown = [
      "<details>",
      "  <summary>사내 공지사항</summary>",
      "  <ul>",
      "    <li>공지 1</li>",
      "  </ul>",
      "</details>",
    ].join("\n");
    const { html } = renderMarkdown(markdown);
    expect(html).toContain(
      '<details data-source-line="1" data-source-end="6">',
    );
    expect(html).toContain("<summary>사내 공지사항</summary>");
    expect(html).toContain("<li>공지 1</li>");
  });

  it("keeps allowed inline raw HTML inside paragraphs", () => {
    const { html } = renderMarkdown("문단 안 <b>굵게</b> 와 <kbd>Ctrl</kbd>.");
    expect(html).toContain("<b>굵게</b>");
    expect(html).toContain("<kbd>Ctrl</kbd>");
  });

  it("renders markdown between details blocks without wrapper divs", () => {
    const markdown = [
      "<details>",
      "<summary>제목</summary>",
      "",
      "- 항목",
      "",
      "</details>",
    ].join("\n");
    const { html } = renderMarkdown(markdown);
    expect(html).toContain(
      '<details data-source-line="1" data-source-end="2">',
    );
    expect(html).toContain('<li data-source-line="4"');
    expect(html).toContain("</details>");
    expect(html).not.toMatch(/<\/details data/);
    expect(html).not.toContain("<div");
  });

  it("preserves the open attribute on details", () => {
    const markdown = "<details open>\n<summary>x</summary>\n</details>";
    const { html } = renderMarkdown(markdown);
    expect(html).toContain('open=""');
  });

  it("strips forged deilen classes and source-line attrs from raw HTML", () => {
    const markdown =
      '<div class="deilen-mermaid" data-source-line="99" data-src="e">x</div>';
    const { html } = renderMarkdown(markdown);
    expect(html).not.toContain("deilen-mermaid");
    expect(html).not.toContain('data-source-line="99"');
    expect(html).not.toContain("data-src");
    expect(html).toContain('<div data-source-line="1"');
  });

  it("removes raw script blocks with their content", () => {
    const { html } = renderMarkdown("<script>\nalert(1)\n</script>");
    expect(html).not.toContain("alert");
    expect(html).not.toContain("script");
  });

  it("strips event handlers and javascript: URLs from raw HTML", () => {
    const markdown =
      '<div onclick="alert(1)"><a href="javascript:x()">x</a></div>';
    const { html } = renderMarkdown(markdown);
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("javascript:");
  });

  it("rejects entity-obfuscated javascript URLs in raw HTML", () => {
    const markdown =
      '링크 <a href="java&#115;cript:alert(1)">a</a> 와 <a href="javascript&colon;alert(1)">b</a>';
    const { html } = renderMarkdown(markdown);
    expect(html).not.toContain("javascript");
    expect(html).not.toContain("&#115;");
  });

  it("removes HTML comments and declarations", () => {
    const markdown = "<!-- hidden <img src=x onerror=y> -->\n\n<!DOCTYPE html>";
    const { html } = renderMarkdown(markdown);
    expect(html).not.toContain("hidden");
    expect(html).not.toContain("DOCTYPE");
    expect(html).not.toContain("onerror");
  });

  it("neutralizes unclosed raw tags by escaping the angle bracket", () => {
    const { html } = renderMarkdown("<div\nonclick=alert(1)");
    expect(html).not.toContain("<div");
    expect(html).toContain("&lt;div");
  });

  it("drops file:// srcs on raw img tags", () => {
    const { html } = renderMarkdown('<img src="file:///tmp/x.png" alt="a">');
    expect(html).not.toContain("file://");
    expect(html).toContain('alt="a"');
  });
});
