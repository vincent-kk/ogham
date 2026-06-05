import { describe, it, expect } from "vitest";
import { markdownToWiki } from "../markdownToWiki.js";

describe("markdownToWiki", () => {
  describe("basic", () => {
    it("renders heading", () => {
      expect(markdownToWiki("# Hello")).toBe("h1. Hello");
    });

    it("renders bullet list", () => {
      expect(markdownToWiki("- A\n- B")).toBe("* A\n* B");
    });

    it("renders code block with language", () => {
      expect(markdownToWiki("```js\nconst x = 1;\n```")).toBe(
        "{code:js}\nconst x = 1;\n{code}",
      );
    });
  });

  describe("edge", () => {
    it("renders bold and italic side by side", () => {
      expect(markdownToWiki("**bold** *em*")).toBe("*bold* _em_");
    });

    it("renders inline code with special characters", () => {
      expect(markdownToWiki("`<>`")).toBe("{{<>}}");
    });

    it("renders multi-line blockquote with quote block", () => {
      expect(markdownToWiki("> first\n> second")).toBe(
        "{quote}\nfirst\nsecond\n{quote}",
      );
    });

    it("renders ordered list with hash markers", () => {
      expect(markdownToWiki("1. A\n2. B")).toBe("# A\n# B");
    });

    it("passes through backslash escapes as raw text", () => {
      expect(markdownToWiki("text \\ more")).toBe("text \\ more");
    });

    it("renders link as wiki bracket form", () => {
      expect(markdownToWiki("[label](https://x.com)")).toBe(
        "[label|https://x.com]",
      );
    });

    it("renders table with double-pipe header", () => {
      expect(markdownToWiki("|h1|h2|\n|---|---|\n|c1|c2|")).toBe(
        "||h1||h2||\n|c1|c2|",
      );
    });

    it("returns empty string for empty input", () => {
      expect(markdownToWiki("")).toBe("");
    });

    it("renders code block without language", () => {
      expect(markdownToWiki("```\nx\n```")).toBe("{code}\nx\n{code}");
    });

    it("renders horizontal rule as four hyphens", () => {
      expect(markdownToWiki("---")).toBe("----");
    });

    it("passes through underscore italic variant as plain text", () => {
      expect(markdownToWiki("_em_")).toBe("_em_");
    });

    it("separates paragraphs with blank line", () => {
      expect(markdownToWiki("A\n\nB")).toBe("A\n\nB");
    });
  });
});
