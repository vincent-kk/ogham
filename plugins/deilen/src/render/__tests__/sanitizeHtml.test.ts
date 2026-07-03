import { describe, expect, it } from "vitest";

import { sanitizeHtml } from "../sanitize/sanitizeHtml.js";

describe("sanitizeHtml", () => {
  it("drops disallowed tags but keeps inner text", () => {
    expect(sanitizeHtml("<center>hi</center>")).toBe("hi");
  });

  it("removes script and style with their contents", () => {
    expect(sanitizeHtml("<script>alert(1)</script>")).toBe("");
    expect(sanitizeHtml("a<style>p{color:red}</style>b")).toBe("ab");
  });

  it("strips event-handler attributes", () => {
    const out = sanitizeHtml('<p onclick="x()" class="c">hi</p>');
    expect(out).toContain('class="c"');
    expect(out).not.toContain("onclick");
  });

  it("keeps safe links", () => {
    expect(sanitizeHtml('<a href="https://x.com">x</a>')).toContain(
      'href="https://x.com"',
    );
  });

  it("removes javascript: hrefs", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe(
      "<a>x</a>",
    );
  });

  it("allows data:image on img but not on links", () => {
    expect(
      sanitizeHtml('<img src="data:image/png;base64,AAAA" alt="a">'),
    ).toContain("data:image/png");
    expect(sanitizeHtml('<a href="data:text/html,x">y</a>')).toBe("<a>y</a>");
  });

  it("keeps text-align style on table cells only", () => {
    expect(sanitizeHtml('<th style="text-align:center">h</th>')).toContain(
      "text-align:center",
    );
    expect(sanitizeHtml('<p style="color:red">x</p>')).toBe("<p>x</p>");
  });

  it("preserves deilen renderer markers verbatim", () => {
    const input =
      '<div class="deilen-mermaid" data-source-line="2"><pre class="deilen-mermaid-src">g</pre></div>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("keeps data-lang and data-display", () => {
    expect(
      sanitizeHtml('<code class="language-js" data-lang="js">x</code>'),
    ).toContain('data-lang="js"');
    expect(
      sanitizeHtml('<span class="deilen-math" data-display="1">y</span>'),
    ).toContain('data-display="1"');
  });

  it("strips disallowed attributes from images", () => {
    const out = sanitizeHtml('<img src="https://x/p.png" onerror="x" alt="a">');
    expect(out).not.toContain("onerror");
    expect(out).toContain('src="https://x/p.png"');
  });

  it("rejects internal class and data attrs in the raw profile", () => {
    const out = sanitizeHtml(
      '<div class="deilen-mermaid" data-source-line="3" data-src="x">g</div>',
      "raw",
    );
    expect(out).toBe("<div>g</div>");
  });

  it("decodes entity-obfuscated schemes before URL checks", () => {
    expect(sanitizeHtml('<a href="java&#115;cript:alert(1)">x</a>')).toBe(
      "<a>x</a>",
    );
    expect(sanitizeHtml('<a href="javascript&colon;alert(1)">x</a>')).toBe(
      "<a>x</a>",
    );
  });

  it("removes comments, declarations, and processing instructions", () => {
    expect(sanitizeHtml("a<!-- c <img onerror=x> -->b")).toBe("ab");
    expect(sanitizeHtml("a<!DOCTYPE html>b<?php x ?>c")).toBe("abc");
    expect(sanitizeHtml("a<!-- never closed")).toBe("a");
  });

  it("escapes leftover angle brackets from unclosed tags", () => {
    expect(sanitizeHtml('<div onclick="alert(1)"')).toBe(
      '&lt;div onclick="alert(1)"',
    );
  });
});
