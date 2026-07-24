import { describe, expect, it } from "vitest";

import { escapeJsonForHtml } from "../escapeJsonForHtml.js";

describe("escapeJsonForHtml", () => {
  it("escapes the HTML-significant characters < > &", () => {
    const out = escapeJsonForHtml({ s: "<&>" });
    expect(out).toBe('{"s":"\\u003c\\u0026\\u003e"}');
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain("&");
  });

  it("prevents breaking out of a <script> element", () => {
    const out = escapeJsonForHtml({ html: "</script>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c/script\\u003e");
  });

  it("escapes the JS line separators U+2028 and U+2029", () => {
    const raw = `${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}`;
    const out = escapeJsonForHtml({ raw });
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
    expect(out).not.toContain(String.fromCharCode(0x2028));
    expect(out).not.toContain(String.fromCharCode(0x2029));
  });

  it("escapes $ so the output cannot form a substitution pattern", () => {
    const state = { note: "a$`b$'c$$d$&e" };
    const escaped = escapeJsonForHtml(state);
    expect(escaped).not.toContain("$");
    expect(JSON.parse(escaped)).toEqual(state);
  });

  it("splices verbatim when used as a String.replace replacement", () => {
    const head = "<html><head><script>var boot=1;</script></head><body>";
    const template = `${head}<script>window.S = "__STATE__";</script>`;
    const escaped = escapeJsonForHtml({ note: "a$`b$'c" });
    expect(template.replace(/["']__STATE__["']/, escaped)).toBe(
      `${head}<script>window.S = ${escaped};</script>`,
    );
  });

  it("leaves a value with no unsafe characters intact", () => {
    const value = { plain: "hello world", n: 42, ok: true };
    expect(escapeJsonForHtml(value)).toBe(JSON.stringify(value));
  });

  it("round-trips back to the original value after unescaping", () => {
    const value = { a: "<b> & </b>", list: [1, 2, 3] };
    const escaped = escapeJsonForHtml(value);
    const unescaped = escaped
      .replace(/\\u003c/g, "<")
      .replace(/\\u003e/g, ">")
      .replace(/\\u0026/g, "&");
    expect(JSON.parse(unescaped)).toEqual(value);
  });
});
