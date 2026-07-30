import { describe, it, expect } from "vitest";
import { markdownToAdf } from "../../converter/index.js";

describe("markdown-to-adf", () => {
  it("produces valid doc structure", () => {
    const adf = markdownToAdf("Hello");
    expect(adf.type).toBe("doc");
    expect(adf.content).toBeDefined();
    expect(adf.content!.length).toBeGreaterThan(0);
  });

  it("converts headings", () => {
    const adf = markdownToAdf("# Title\n## Subtitle");
    const h1 = adf.content!.find(
      (n) => n.type === "heading" && n.attrs?.level === 1,
    );
    const h2 = adf.content!.find(
      (n) => n.type === "heading" && n.attrs?.level === 2,
    );
    expect(h1).toBeDefined();
    expect(h2).toBeDefined();
  });

  it("converts code blocks with language", () => {
    const adf = markdownToAdf("```typescript\nconst x = 1;\n```");
    const cb = adf.content!.find((n) => n.type === "codeBlock");
    expect(cb).toBeDefined();
    expect(cb!.attrs?.language).toBe("typescript");
  });

  it("converts bullet list", () => {
    const adf = markdownToAdf("- one\n- two");
    const list = adf.content!.find((n) => n.type === "bulletList");
    expect(list).toBeDefined();
    expect(list!.content!.length).toBe(2);
  });

  it("converts ordered list", () => {
    const adf = markdownToAdf("1. first\n2. second");
    const list = adf.content!.find((n) => n.type === "orderedList");
    expect(list).toBeDefined();
    expect(list!.content!.length).toBe(2);
  });

  it("converts blockquote", () => {
    const adf = markdownToAdf("> quoted text");
    const bq = adf.content!.find((n) => n.type === "blockquote");
    expect(bq).toBeDefined();
  });

  it("converts horizontal rule", () => {
    const adf = markdownToAdf("---");
    const rule = adf.content!.find((n) => n.type === "rule");
    expect(rule).toBeDefined();
  });

  it("converts table", () => {
    const md = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const adf = markdownToAdf(md);
    const table = adf.content!.find((n) => n.type === "table");
    expect(table).toBeDefined();
    expect(table!.content!.length).toBe(2); // header + data row
  });

  it("converts inline bold/italic/code", () => {
    const adf = markdownToAdf("**bold** *italic* `code`");
    const para = adf.content![0];
    expect(para.type).toBe("paragraph");
    const strong = para.content!.find((n) =>
      n.marks?.some((m) => m.type === "strong"),
    );
    const em = para.content!.find((n) => n.marks?.some((m) => m.type === "em"));
    const code = para.content!.find((n) =>
      n.marks?.some((m) => m.type === "code"),
    );
    expect(strong).toBeDefined();
    expect(em).toBeDefined();
    expect(code).toBeDefined();
  });

  it("handles empty input", () => {
    const adf = markdownToAdf("");
    expect(adf.content!.length).toBe(1);
    expect(adf.content![0].type).toBe("paragraph");
  });
});
