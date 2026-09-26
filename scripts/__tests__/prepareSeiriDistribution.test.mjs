import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  compileDistribution,
  distributionHashes,
  prepareSeiriDistribution,
  validateSeiriDistribution,
} from "../prepareSeiriDistribution.mjs";
import { seiriDistributionFixture } from "./fixtures/seiriDistribution.mjs";

describe("prepareSeiriDistribution", () => {
  it("emits the JavaScript and declarations promised by package exports", () => {
    const config = JSON.parse(
      readFileSync(
        new URL("../../plugins/seiri/tsconfig.build.json", import.meta.url),
        "utf8",
      ),
    );
    assert.equal(config.compilerOptions.noEmit, false);
    assert.equal(config.compilerOptions.emitDeclarationOnly, false);
  });
  it("declares the generated adapters in the real package allowlist", () => {
    const pkg = JSON.parse(
      readFileSync(
        new URL("../../plugins/seiri/package.json", import.meta.url),
        "utf8",
      ),
    );
    for (const entry of [
      "plugin.json",
      ".codex-plugin/",
      "mcp_config.json",
      "hooks.json",
      "plugin-compiler.json",
    ])
      assert.ok(pkg.files.includes(entry), entry);
  });

  it("packages only declared inputs and fresh adapters without changing source bytes", (t) => {
    const f = seiriDistributionFixture(t);
    const before = distributionHashes(f.source);
    const result = prepareSeiriDistribution(f);
    assert.ok(result.files.includes("plugin.json"));
    assert.ok(result.files.includes(".codex-plugin/plugin.json"));
    assert.ok(result.files.includes("mcp_config.json"));
    assert.ok(result.files.includes("bridge/mcp-server.cjs"));
    assert.ok(result.files.includes("plugin-compiler.json"));
    assert.match(
      readFileSync(join(f.output, ".codex-plugin/hooks.json"), "utf8"),
      /bridge\/codex\/pre-tool-use\.mjs/,
    );
    assert.ok(!result.files.includes(".codex-plugin/stale.txt"));
    assert.ok(!result.files.includes("private-not-packaged.txt"));
    assert.deepEqual(distributionHashes(f.source), before);
    assert.equal(
      readFileSync(join(f.output, "plugin.json"), "utf8"),
      readFileSync(join(f.output, ".codex-plugin/plugin.json"), "utf8"),
    );
  });

  it("requires a new absolute output and preserves any existing destination", (t) => {
    const f = seiriDistributionFixture(t);
    assert.throws(
      () => prepareSeiriDistribution({ ...f, output: "relative" }),
      /absolute/,
    );
    assert.throws(
      () => prepareSeiriDistribution({ ...f, output: f.source }),
      /already exist/,
    );
    assert.throws(
      () =>
        prepareSeiriDistribution({ ...f, output: join(f.source, "nested") }),
      /outside/,
    );
    assert.ok(existsSync(join(f.source, "private-not-packaged.txt")));
  });

  it("rejects missing current runtime instead of substituting tracked adapters", (t) => {
    const f = seiriDistributionFixture(t);
    rmSync(join(f.source, "bridge/mcp-server.cjs"));
    assert.throws(
      () => prepareSeiriDistribution(f),
      /Missing distribution reference: bridge\/mcp-server.cjs/,
    );
    assert.equal(existsSync(f.output), false);
  });

  it("rejects workspace symlinks before creating the distribution", (t) => {
    const f = seiriDistributionFixture(t);
    symlinkSync(join(f.source, "README.md"), join(f.source, "skills/leak.md"));
    assert.throws(() => prepareSeiriDistribution(f), /symlink/);
    assert.equal(existsSync(f.output), false);
  });

  it("rejects missing build-selected nested host runtime", (t) => {
    const f = seiriDistributionFixture(t);
    rmSync(join(f.source, "bridge/codex/pre-tool-use.mjs"));
    assert.throws(
      () => prepareSeiriDistribution(f),
      /Missing distribution reference: bridge\/codex\/pre-tool-use.mjs/,
    );
  });

  it("requires package allowlist coverage for host adapters", (t) => {
    const f = seiriDistributionFixture(t);
    const pkg = JSON.parse(
      readFileSync(join(f.source, "package.json"), "utf8"),
    );
    pkg.files = pkg.files.filter((file) => file !== "plugin.json");
    f.write("package.json", pkg);
    assert.throws(
      () => prepareSeiriDistribution(f),
      /Missing package.files entry: plugin.json/,
    );
  });

  it("detects canonical mutation by a compiler and removes incomplete output", (t) => {
    const f = seiriDistributionFixture(t);
    assert.throws(
      () =>
        prepareSeiriDistribution({
          ...f,
          compile(output) {
            compileDistribution(output);
            writeFileSync(join(output, "skills/execute/SKILL.md"), "changed");
          },
        }),
      /changed canonical/,
    );
    assert.equal(existsSync(f.output), false);
  });

  it("rejects manifest disagreement and missing copied references", (t) => {
    const f = seiriDistributionFixture(t);
    prepareSeiriDistribution(f);
    const manifest = readFileSync(join(f.output, "plugin.json"));
    writeFileSync(join(f.output, ".codex-plugin/plugin.json"), "{}");
    assert.throws(
      () => validateSeiriDistribution(f.output),
      /manifests differ/,
    );
    writeFileSync(join(f.output, ".codex-plugin/plugin.json"), manifest);
    rmSync(join(f.output, "skills/execute/references/sample.md"));
    assert.throws(
      () => validateSeiriDistribution(f.output),
      /Missing distribution reference/,
    );
  });
});
