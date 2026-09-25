#!/usr/bin/env node
/**
 * Run after the designated provider + seiri build. Copies package inputs into a
 * new distribution and invokes plugin-compiler there; tracked adapters are never inputs.
 * Usage: node scripts/prepareSeiriDistribution.mjs --output <new absolute directory>
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Repository location, independent of the caller's working directory. */
const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** Compiler-owned outputs excluded even if stale copies exist in the checkout. */
const generated = [
  "plugin.json",
  ".codex-plugin",
  "mcp_config.json",
  "hooks.json",
];

/** Return sorted file paths; symlinks cannot smuggle workspace dependencies into a distribution. */
function distributionFiles(root, directory = root) {
  return readdirSync(directory)
    .sort()
    .flatMap((name) => {
      const path = join(directory, name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink())
        throw new Error(
          `Distribution input is a symlink: ${relative(root, path)}`,
        );
      return stat.isDirectory()
        ? distributionFiles(root, path)
        : [relative(root, path).split(sep).join("/")];
    });
}

/** Hash named artifacts without returning their contents (including MCP configuration). */
export function distributionHashes(root, files = distributionFiles(root)) {
  return Object.fromEntries(
    files.map((file) => [
      file,
      createHash("sha256")
        .update(readFileSync(join(root, file)))
        .digest("hex"),
    ]),
  );
}

/** Compile only the staging tree, using the repository's existing CLI and pinned dependencies. */
export function compileDistribution(output) {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      join(repository, "tools/plugin-compiler/src/main.ts"),
      "sync",
      output,
    ],
    { cwd: repository, encoding: "utf8" },
  );
  if (result.error || result.status !== 0)
    throw new Error(
      `Distribution compiler failed (exit ${result.status ?? "unavailable"})`,
    );
}

/** Resolve a package-local reference and require its target to exist. */
function requireReference(output, reference) {
  const target = resolve(output, reference);
  if (target !== output && !target.startsWith(`${output}${sep}`))
    throw new Error(`Distribution reference escapes package: ${reference}`);
  if (!existsSync(target))
    throw new Error(`Missing distribution reference: ${reference}`);
}

/** Validate manifest parity, runtime references, and copied skill links after compilation. */
export function validateSeiriDistribution(output) {
  const rootBytes = readFileSync(join(output, "plugin.json"), "utf8");
  if (
    rootBytes !==
    readFileSync(join(output, ".codex-plugin/plugin.json"), "utf8")
  )
    throw new Error("Root and Codex manifests differ");
  const manifest = JSON.parse(rootBytes);
  for (const field of ["skills", "hooks"]) {
    if (typeof manifest[field] !== "string")
      throw new Error(`Missing Codex ${field} reference`);
    requireReference(output, manifest[field]);
  }
  for (const server of Object.values(manifest.mcpServers ?? {})) {
    for (const argument of server.args ?? []) {
      if (/^(?:\.\/)?(?:bridge|libs)\//.test(argument))
        requireReference(output, argument);
    }
  }
  const files = distributionFiles(output);
  for (const file of files.filter((name) =>
    /(?:^|\/)hooks\.json$/.test(name),
  )) {
    const text = readFileSync(join(output, file), "utf8");
    for (const match of text.matchAll(
      /\$\{(?:CLAUDE|CODEX)_PLUGIN_ROOT\}\/([^\s"\\]+)/g,
    ))
      requireReference(output, match[1]);
    for (const match of text.matchAll(
      /(?:\.\/)?bridge\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:mjs|cjs)/g,
    ))
      requireReference(output, match[0]);
  }
  for (const file of files.filter(
    (name) => name.endsWith(".md") && name.includes("skills/"),
  )) {
    const text = readFileSync(join(output, file), "utf8");
    for (const match of text.matchAll(/\]\(([^\s)#]+\.md)(?:#[^)]*)?\)/g)) {
      if (!/^[a-z]+:/i.test(match[1]))
        requireReference(output, join(dirname(file), match[1]));
    }
    if (
      file.startsWith(".codex-plugin/skills/") &&
      /mcp__plugin_seiri_tools__/.test(text)
    )
      throw new Error(`Unadapted Codex tool reference: ${file}`);
  }
  return files;
}

/** Prepare a new directory; callers must first build current runtime sources. No release is performed. */
export function prepareSeiriDistribution({
  output,
  source = join(repository, "plugins/seiri"),
  compile = compileDistribution,
}) {
  if (!isAbsolute(output))
    throw new Error("--output must be an absolute directory");
  output = resolve(output);
  source = resolve(source);
  if (existsSync(output)) throw new Error("--output must not already exist");
  if (output.startsWith(`${source}${sep}`))
    throw new Error("--output must be outside the source plugin");
  const pkg = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
  for (const required of ["plugin.json", ".codex-plugin/", "mcp_config.json"]) {
    if (!pkg.files.includes(required))
      throw new Error(`Missing package.files entry: ${required}`);
  }
  const inputs = [
    "package.json",
    ...pkg.files.filter((file) => !generated.includes(file.replace(/\/$/, ""))),
  ];
  for (const input of inputs) {
    if (
      isAbsolute(input) ||
      input.split(/[\\/]/).includes("..") ||
      /[*?{}]/.test(input)
    )
      throw new Error(`Unsupported package.files entry: ${input}`);
    const path = join(source, input);
    if (!existsSync(path))
      throw new Error(`Build before preparing distribution; missing ${input}`);
    if (lstatSync(path).isSymbolicLink())
      throw new Error(`Distribution input is a symlink: ${input}`);
    if (lstatSync(path).isDirectory()) distributionFiles(path);
  }
  mkdirSync(output, { recursive: true });
  try {
    for (const input of inputs)
      cpSync(join(source, input), join(output, input), { recursive: true });
    const canonical = distributionHashes(output);
    compile(output);
    if (
      JSON.stringify(distributionHashes(output, Object.keys(canonical))) !==
      JSON.stringify(canonical)
    )
      throw new Error("Compiler changed canonical distribution inputs");
    return { output, files: validateSeiriDistribution(output) };
  } catch (error) {
    rmSync(output, { recursive: true, force: true });
    throw error;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2 || args[0] !== "--output")
      throw new Error(
        "Usage: prepareSeiriDistribution.mjs --output <new absolute directory>",
      );
    const result = prepareSeiriDistribution({ output: args[1] });
    console.log(`Prepared ${result.files.length} files: ${result.output}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
