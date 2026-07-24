import { describe, it, expect } from "vitest";
import { markdownToWiki } from "../markdownToWiki.js";

describe("markdownToWiki wiki-special escaping", () => {
  describe("basic", () => {
    it("escapes brackets that Jira would parse as a link", () => {
      expect(markdownToWiki("array [0] access")).toBe("array \\[0\\] access");
    });

    it("escapes braces that Jira would parse as a macro", () => {
      expect(markdownToWiki("use {noformat} here")).toBe(
        "use \\{noformat\\} here",
      );
    });

    it("escapes pipe in plain text", () => {
      expect(markdownToWiki("a|b")).toBe("a\\|b");
    });
  });

  describe("complex", () => {
    it("escapes underscores that Jira would parse as emphasis", () => {
      expect(markdownToWiki("some_var_name")).toBe("some\\_var\\_name");
    });

    it("escapes hyphen and plus pair characters", () => {
      expect(markdownToWiki("2026-07-22 a+b+c")).toBe(
        "2026\\-07\\-22 a\\+b\\+c",
      );
    });

    it("escapes exclamations that Jira would parse as an image", () => {
      expect(markdownToWiki("warn! done!")).toBe("warn\\! done\\!");
    });

    it("escapes caret and tilde pair characters", () => {
      expect(markdownToWiki("x^2^ and ~50%")).toBe("x\\^2\\^ and \\~50%");
    });

    it("escapes specials inside inline code", () => {
      expect(markdownToWiki("`arr[0]`")).toBe("{{arr\\[0\\]}}");
    });

    it("escapes specials inside bold text", () => {
      expect(markdownToWiki("**val[0]**")).toBe("*val\\[0\\]*");
    });

    it("escapes specials in table cells without breaking structure", () => {
      expect(markdownToWiki("|h[0]|h2|\n|---|---|\n|c{m}|d|")).toBe(
        "||h\\[0\\]||h2||\n|c\\{m\\}|d|",
      );
    });

    it("escapes specials in headings", () => {
      expect(markdownToWiki("# Release [1.2]")).toBe("h1. Release \\[1.2\\]");
    });

    it("keeps already-escaped specials without double escaping", () => {
      expect(markdownToWiki("\\[0\\]")).toBe("\\[0\\]");
    });

    it("leaves backslashes before non-special characters untouched", () => {
      expect(markdownToWiki("C:\\temp\\new.txt")).toBe("C:\\temp\\new.txt");
    });
  });
});
