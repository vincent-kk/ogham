import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

import { expect, it } from "vitest";

const app = readFileSync(
  join(import.meta.dirname, "../scripts/app.js"),
  "utf8",
);

it("uses the server initial scope without judging config layers", () => {
  const declaration = app.match(/let scope = [^;]+;/)?.[0];
  expect(declaration).toBeDefined();
  for (const initialScope of ["project", "user"])
    expect(
      runInNewContext(declaration + "scope", { injected: { initialScope } }),
    ).toBe(initialScope);
});

it("keeps the selected scope when saved state is adopted", () => {
  const adopt = app.slice(
    app.indexOf("function adoptState("),
    app.indexOf("async function save("),
  );
  for (const scope of ["project", "user"]) {
    const context = { scope, state: {}, overridden: [], renderScope() {} };
    runInNewContext(
      adopt + "; adoptState({ paths: { project: null }, overridden: [] });",
      context,
    );
    expect(context.scope).toBe(scope);
  }
});
