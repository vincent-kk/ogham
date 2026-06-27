import { describe, expect, it } from "vitest";

import { renderMarkdown } from "../operations/renderMarkdown.js";
import { walkLocalImages } from "../utils/walkLocalImages.js";

const rewrite = { sessionId: "rs_abc", token: "tok123" };

describe("renderMarkdown imageRewrite", () => {
  it("rewrites a file:// image to the /api/image route", () => {
    const { html } = renderMarkdown("![plot](file:///tmp/p.png)", {
      imageRewrite: rewrite,
    });
    expect(html).toContain('src="/api/image/rs_abc/0?token=tok123"');
    expect(html).toContain('alt="plot"');
  });

  it("leaves remote and relative sources untouched", () => {
    const { html } = renderMarkdown(
      "![a](https://x/y.png)\n\n![b](data:image/png;base64,AAAA)\n\n![c](./rel.png)",
      { imageRewrite: rewrite },
    );
    expect(html).toContain('src="https://x/y.png"');
    expect(html).toContain("data:image/png;base64,AAAA");
    expect(html).toContain('src="./rel.png"');
    expect(html).not.toContain("/api/image/");
  });

  it("indexes only file:// images in document order", () => {
    const { html } = renderMarkdown(
      "![0](file:///a.png)\n\n![x](https://h/z.png)\n\n![1](file:///b.svg)",
      { imageRewrite: rewrite },
    );
    expect(html).toContain('src="/api/image/rs_abc/0?token=tok123"');
    expect(html).toContain('src="/api/image/rs_abc/1?token=tok123"');
    expect(html).toContain('src="https://h/z.png"');
  });

  it("drops a file:// src when no imageRewrite is provided", () => {
    const { html } = renderMarkdown("![p](file:///a.png)");
    expect(html).not.toContain("/api/image/");
    expect(html).not.toContain("file://");
  });

  it("url-encodes the token in the rewritten src", () => {
    const { html } = renderMarkdown("![p](file:///a.png)", {
      imageRewrite: { sessionId: "rs_x", token: "a/b+c" },
    });
    expect(html).toContain("token=a%2Fb%2Bc");
  });
});

describe("walkLocalImages", () => {
  it("visits file:// images in order, skipping remote and relative", () => {
    const seen: Array<[string, number]> = [];
    walkLocalImages(
      "![0](file:///a.png) ![x](https://h/z.png) ![1](file:///b.svg) ![y](./r.png)",
      (src, i) => seen.push([src, i]),
    );
    expect(seen).toEqual([
      ["file:///a.png", 0],
      ["file:///b.svg", 1],
    ]);
  });

  it("visits nothing without local images", () => {
    const seen: string[] = [];
    walkLocalImages("![a](https://x/y.png)\n\ntext", (s) => seen.push(s));
    expect(seen).toEqual([]);
  });
});
