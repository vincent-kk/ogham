import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it, vi } from "vitest";

/** Capture build output in memory so verification does not modify generated files. */
const output = vi.hoisted(() => ({ html: "" }));
vi.mock("node:fs/promises", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs/promises")>()),
  mkdir: vi.fn(),
  writeFile: vi.fn((_path: string, content: string) => {
    output.html = content;
  }),
}));

beforeEach(() => {
  output.html = "";
  vi.resetModules();
});

it("inlines every production script in source order without emitting mock code", async () => {
  const source = readFileSync(
    join(import.meta.dirname, "../index.html"),
    "utf8",
  );
  const builder = join(
    import.meta.dirname,
    "../../../../../scripts/buildSettingsHtml.mjs",
  );
  await import(builder);
  expect(output.html).not.toMatch(/<script\s+src=/);
  expect(output.html).not.toContain("mock-api");
  const names = [
    ...source.matchAll(
      /<script src="\.\/scripts\/helpers\/(?:[^\"]*\/)?([^/\"]+)\.js"/g,
    ),
  ]
    .map((match) => match[1])
    .filter((name) => name !== "registry");
  let previous = -1;
  for (const name of names) {
    const at = output.html.indexOf(`__settingsHelpers.${name}=`);
    expect(at, name).toBeGreaterThan(previous);
    previous = at;
  }
  expect(output.html.indexOf("__settingsApp=")).toBeGreaterThan(previous);
});
