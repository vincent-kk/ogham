import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, it } from "vitest";

import { saveConfig, saveCredentials } from "../../../core/config/index.js";
import { buildToolContext } from "../helpers/buildContext.js";
import { toolResult } from "../helpers/toolResult.js";

it("keeps credentials usable for HTTP but excludes them from context JSON", async () => {
  const dir = await mkdtemp(join(tmpdir(), "entrez-context-"));
  try {
    const configLayers = { user: join(dir, "config.json"), project: null };
    const credentialsPath = join(dir, "credentials.json");
    const apiKey = "context-secret-test-value";
    await saveConfig(
      "user",
      { tool: "test", email: "test@example.com" },
      configLayers,
    );
    await saveCredentials({ api_key: apiKey }, credentialsPath);

    const ctx = await buildToolContext({ configLayers, credentialsPath });
    ctx.nowMs = 123;

    expect(ctx.credentials.api_key).toBe(apiKey);
    expect(ctx.deps.apiKey).toBe(apiKey);
    expect({ ...ctx.deps }.apiKey).toBe(apiKey);
    expect(JSON.stringify(ctx)).not.toContain(apiKey);
    expect(toolResult(ctx).content[0].text).not.toContain(apiKey);
    expect(JSON.parse(JSON.stringify(ctx))).toMatchObject({
      config: { tool: "test" },
      deps: { tool: "test" },
      baseUrl: ctx.baseUrl,
      db: ctx.db,
      nowMs: 123,
    });
    expect(JSON.parse(JSON.stringify(ctx))).not.toHaveProperty("credentials");
    expect(JSON.parse(JSON.stringify(ctx)).deps).not.toHaveProperty("apiKey");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
