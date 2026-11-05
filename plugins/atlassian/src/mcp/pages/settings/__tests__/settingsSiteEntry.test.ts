import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

it("creates a cloud field and an accessible button that removes its row", () => {
  const remove = vi.fn();
  const setAttribute = vi.fn();
  const appendChild = vi.fn();
  const addEventListener = vi.fn();
  const node = { setAttribute, appendChild, addEventListener, remove };
  const document = {
    createElement: vi.fn(() => node),
    createElementNS: vi.fn(() => node),
    createTextNode: vi.fn((text: string) => text),
    addEventListener() {},
    getElementById: () => null,
  };
  const context = {
    document,
    window: {
      location: { search: "" },
      __SETTINGS_STATE__: { initialScope: "user" },
    },
    URLSearchParams,
  };
  const root = join(import.meta.dirname, "..");
  const html = readFileSync(join(root, "index.html"), "utf8");
  for (const match of html.matchAll(/<script src="\.\/(scripts\/[^\"]+)"/g)) {
    if (match[1] === "scripts/json-import.js") continue;
    let source = readFileSync(join(root, match[1]), "utf8");
    if (match[1] === "scripts/app.js") {
      source = source.replace(/\}\)\(\);\s*$/, "createSiteEntry(7); })();");
    }
    runInNewContext(source, context);
  }
  expect(setAttribute).toHaveBeenCalledWith(
    "data-field",
    "cloud.sites.7.base_url",
  );
  expect(setAttribute).toHaveBeenCalledWith("data-site-index", "7");
  expect(setAttribute).toHaveBeenCalledWith("aria-label", "Remove site");
  expect(document.createElementNS).toHaveBeenCalledWith(
    "http://www.w3.org/2000/svg",
    "svg",
  );
  expect(document.createElementNS).toHaveBeenCalledTimes(3);
  const click = addEventListener.mock.calls[0];
  expect(click[0]).toBe("click");
  click[1]();
  expect(remove).toHaveBeenCalledOnce();
});
