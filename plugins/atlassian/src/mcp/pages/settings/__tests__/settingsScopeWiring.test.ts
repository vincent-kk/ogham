import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SETTINGS_DIR = join(import.meta.dirname, "..");
const WEB_SERVER_DIR = join(
  import.meta.dirname,
  "../../../tools/setup/webServer",
);

const readSettingsFile = (path: string) =>
  readFileSync(join(SETTINGS_DIR, path), "utf8");

// The server states one half of this contract and the page the other. The page
// is a standalone browser script, so nothing at build time connects the two —
// this spec is what keeps them from drifting apart.
describe("config scope wiring between the settings server and its page", () => {
  it("reads the scope off the injected document, not the page's UI state", () => {
    const app = readSettingsFile("scripts/app.js");

    // `state` is the page's UI-local object — tab, editMode, loading,
    // cloudSiteCount. It never carries the injected document, so reading scope
    // from it pinned the toggle to `user` and left Project permanently
    // disabled no matter what the server sent.
    expect(app).not.toMatch(/state\s*&&\s*state\.scope/);
    expect(app).toMatch(/injected\s*&&\s*injected\.scope/);
  });

  it("parses the injected slot once, before the scope state is derived", () => {
    const app = readSettingsFile("scripts/app.js");

    // Deriving scope at IIFE top level while parsing happened inside a
    // DOMContentLoaded handler was the ordering that made the value
    // unreachable — one parse, read by both, removes the ordering question.
    const parseAt = app.indexOf("readInjectedState()");
    const deriveAt = app.search(/var scopeState =/);

    expect(parseAt).toBeGreaterThan(-1);
    expect(deriveAt).toBeGreaterThan(-1);
    expect(parseAt).toBeLessThan(deriveAt);
  });

  it("injects the scope state under the key the page reads", () => {
    const handler = readFileSync(
      join(WEB_SERVER_DIR, "handlers/handleGetRoot.ts"),
      "utf8",
    );

    expect(handler).toContain("scope: ctx.loadConfigScope()");
  });
});
