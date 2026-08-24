#!/usr/bin/env node

/**
 * Reorder SKILL.md frontmatter without changing its values or body.
 *
 * Canonical order:
 *   name, user-invocable, disable-model-invocation, description,
 *   argument-hint, version, complexity, plugin-specific keys, plugin
 *
 * Usage:
 *   node scripts/formatSkillFrontmatter.mjs [paths...] [--check]
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const canonicalKeys = [
  "name",
  "user-invocable",
  "disable-model-invocation",
  "description",
  "argument-hint",
  "version",
  "complexity",
];
const skippedDirectories = new Set(["node_modules"]);

function splitFrontmatter(source) {
  const opening = source.match(/^---(\r?\n)/);
  if (!opening) {
    throw new Error("SKILL.md must start with YAML frontmatter");
  }

  const newline = opening[1];
  const closing = `${newline}---`;
  const closingIndex = source.indexOf(closing, opening[0].length);
  if (closingIndex === -1) {
    throw new Error("SKILL.md frontmatter is missing its closing delimiter");
  }

  return {
    content: source.slice(opening[0].length, closingIndex),
    newline,
    opening: opening[0],
    tail: source.slice(closingIndex + closing.length),
  };
}

function frontmatterEntries(content, newline) {
  const lines = content.split(newline);
  const starts = [];

  for (const [index, line] of lines.entries()) {
    const match = line.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (match) {
      starts.push({ index, key: match[1] });
    }
  }

  if (starts.length === 0) {
    throw new Error("SKILL.md frontmatter has no top-level keys");
  }

  const seen = new Set();
  for (const { key } of starts) {
    if (seen.has(key)) {
      throw new Error(`SKILL.md frontmatter contains duplicate key: ${key}`);
    }
    seen.add(key);
  }

  return {
    entries: starts.map(({ index, key }, entryIndex) => ({
      key,
      lines: lines.slice(index, starts[entryIndex + 1]?.index),
      originalIndex: entryIndex,
    })),
    prefix: lines.slice(0, starts[0].index),
  };
}

function keyRank(key) {
  const canonicalIndex = canonicalKeys.indexOf(key);
  if (canonicalIndex !== -1) {
    return canonicalIndex;
  }
  return key === "plugin" ? canonicalKeys.length + 1 : canonicalKeys.length;
}

export function formatSkillFrontmatter(source) {
  const { content, newline, opening, tail } = splitFrontmatter(source);
  const { entries, prefix } = frontmatterEntries(content, newline);
  const orderedLines = entries
    .toSorted(
      (left, right) =>
        keyRank(left.key) - keyRank(right.key) ||
        left.originalIndex - right.originalIndex,
    )
    .flatMap((entry) => entry.lines);

  return `${opening}${[...prefix, ...orderedLines].join(newline)}${newline}---${tail}`;
}

async function collectSkillFiles(path) {
  const metadata = await stat(path);
  if (metadata.isFile()) {
    return basename(path) === "SKILL.md" ? [path] : [];
  }

  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || skippedDirectories.has(entry.name)) {
      continue;
    }
    const entryPath = join(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSkillFiles(entryPath)));
    } else if (entry.isFile() && entry.name === "SKILL.md") {
      files.push(entryPath);
    }
  }
  return files;
}

async function main() {
  const check = process.argv.includes("--check");
  const targetArguments = process.argv
    .slice(2)
    .filter((argument) => argument !== "--check");
  const targets = targetArguments.length > 0 ? targetArguments : ["plugins"];
  const files = (
    await Promise.all(
      targets.map((target) => collectSkillFiles(resolve(target))),
    )
  )
    .flat()
    .filter((file, index, all) => all.indexOf(file) === index)
    .sort();
  const changed = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const output = formatSkillFrontmatter(source);
    if (output === source) {
      continue;
    }
    changed.push(relative(process.cwd(), file));
    if (!check) {
      await writeFile(file, output, "utf8");
    }
  }

  console.log(
    `${check ? "Would format" : "Formatted"} ${changed.length}/${files.length} SKILL.md files.`,
  );
  if (check && changed.length > 0) {
    for (const file of changed) {
      console.log(file);
    }
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
