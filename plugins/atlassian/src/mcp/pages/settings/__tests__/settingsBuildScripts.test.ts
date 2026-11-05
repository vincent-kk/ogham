import { readFileSync } from "node:fs";
import { join } from "node:path";
import { transform } from "esbuild";
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

it("inlines every stylesheet in source order with all declarations intact", async () => {
  const settingsDir = join(import.meta.dirname, "..");
  const source = readFileSync(join(settingsDir, "index.html"), "utf8");
  const stylesheets = [
    ...source.matchAll(
      /<link href="\.\/(styles\/[^\"]+\.css)" rel="stylesheet"/g,
    ),
  ];
  const expected = await Promise.all(
    stylesheets.map(async ([, path]) => {
      const result = await transform(
        readFileSync(join(settingsDir, path), "utf8"),
        {
          loader: "css",
          minify: true,
        },
      );
      return result.code.trim();
    }),
  );
  const builder = join(
    import.meta.dirname,
    "../../../../../scripts/buildSettingsHtml.mjs",
  );
  await import(builder);
  expect(expected.length).toBeGreaterThan(0);
  expect(/<link[^>]*rel="stylesheet"/.test(output.html)).toBe(false);
  const actual = [
    ...output.html.matchAll(/<style>\s*([\s\S]*?)\s*<\/style>/g),
  ].map(([, css]) => css.trim());
  expect(actual).toEqual(expected);
});
