import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SETTINGS_DIR = join(import.meta.dirname, "..");
const HANDLERS_DIR = join(
  import.meta.dirname,
  "../../../tools/setup/webServer/handlers",
);

const readSettingsFile = (path: string): string =>
  readFileSync(join(SETTINGS_DIR, path), "utf8");

// The server states one half of this contract and the page the other. The page
// is a standalone browser script, so nothing at build time connects the two.
// Contract: cross-platform DETAIL.md "설정 페이지 계약".
describe("per-layer prefill wiring between the setup server and its page", () => {
  it("injects one prefill view per layer under the key the page reads", () => {
    const handler = readFileSync(
      join(HANDLERS_DIR, "handleGetRoot.ts"),
      "utf8",
    );
    const app = readSettingsFile("scripts/app.js");

    expect(handler).toContain("ctx.loadConfigByScope()");
    expect(handler).toContain("configByScope");
    expect(app).toContain("state.configByScope");
  });

  it("re-seats the form when the scope toggle moves", () => {
    const app = readSettingsFile("scripts/app.js");

    const handler = app.slice(
      app.indexOf('radio.addEventListener("change"'),
      app.indexOf("var text = document.createElement"),
    );
    expect(handler).toContain("prefillConfig()");
  });

  it("leaves the credential-backed fields out of the per-layer seating", () => {
    const app = readSettingsFile("scripts/app.js");

    // The api key lives in the separate credentials file and the download
    // path suggestions come from the host — neither belongs to a config
    // layer, and re-seating them would stack duplicate datalist options.
    const seat = app.slice(
      app.indexOf("function prefillConfig()"),
      app.indexOf("function prefillOnce()"),
    );
    expect(seat).not.toContain("fillPathSuggestions");
    expect(seat).not.toContain("apiKeyInput");
  });
});
