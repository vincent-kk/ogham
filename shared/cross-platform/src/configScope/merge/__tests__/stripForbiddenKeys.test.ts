import { describe, expect, it } from "vitest";

import { stripForbiddenKeys } from "../index.js";

/** JSON.parse is the only way to get these as own keys; a literal sets the
 *  prototype instead, which is a different thing entirely. */
function parse(json: string): Record<string, unknown> {
  return JSON.parse(json) as Record<string, unknown>;
}

describe("stripForbiddenKeys", () => {
  it("passes an ordinary document through", () => {
    expect(stripForbiddenKeys({ theme: "dark", port: 0 })).toEqual({
      theme: "dark",
      port: 0,
    });
  });

  it("drops __proto__ at the top level", () => {
    const safe = stripForbiddenKeys(
      parse('{"__proto__":{"polluted":"x"},"theme":"dark"}'),
    );

    expect(Object.hasOwn(safe, "__proto__")).toBe(false);
    expect(safe).toEqual({ theme: "dark" });
  });

  it("drops constructor and prototype", () => {
    const safe = stripForbiddenKeys(
      parse('{"constructor":1,"prototype":2,"keep":3}'),
    );

    expect(safe).toEqual({ keep: 3 });
  });

  it("drops an unsafe key nested inside a plain object", () => {
    const safe = stripForbiddenKeys(
      parse('{"renderers":{"constructor":1,"mermaid":true}}'),
    );

    expect(safe).toEqual({ renderers: { mermaid: true } });
  });

  it("leaves array elements alone, matching mergeConfigLayers", () => {
    // The merge replaces arrays wholesale and never assigns into their
    // elements, so no prototype setter is reachable through one. Scrubbing
    // further here would make the writer and the merge disagree about what
    // "unsafe" means.
    const safe = stripForbiddenKeys(parse('{"sites":[{"constructor":1}]}'));

    expect(safe).toEqual({ sites: [{ constructor: 1 }] });
  });

  it("returns a new object and does not mutate the input", () => {
    const document = { nested: { keep: 1 } };
    const safe = stripForbiddenKeys(document);

    expect(safe).not.toBe(document);
    expect(safe.nested).not.toBe(document.nested);
    expect(document).toEqual({ nested: { keep: 1 } });
  });

  it("keeps an explicit null and an empty object", () => {
    expect(stripForbiddenKeys({ font: null, renderers: {} })).toEqual({
      font: null,
      renderers: {},
    });
  });
});
