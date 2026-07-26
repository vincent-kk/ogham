#!/usr/bin/env node
/**
 * Unwrap Markdown soft wraps without changing block structure.
 *
 * Modes:
 *   default        — rewrite Markdown files in place (default target: plugins/)
 *   --check        — report files that would change; exit 1 if any
 *
 * Usage:
 *   node scripts/formatMarkdown.mjs [paths...] [--check]
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: false,
});
const skippedDirectories = new Set([
  "node_modules",
  "dist",
  "bridge",
  "public",
  "coverage",
]);

function tokenSignatures(tokens = []) {
  const signatures = [];

  for (const token of tokens) {
    if (token.type === "softbreak") {
      continue;
    }

    const exactContent = new Set(["fence", "code_block", "html_block"]);
    const signature = {
      type: token.type,
      tag: token.tag,
      nesting: token.nesting,
      markup: token.type === "text" ? "" : token.markup,
      info: token.type === "text" ? "" : token.info.trim(),
      attrs: token.attrs ?? [],
      content: exactContent.has(token.type)
        ? token.content
        : token.content.replace(/\s+/g, " ").trim(),
      children: tokenSignatures(token.children ?? []),
    };

    if (signature.type === "text" && signature.content === "") {
      continue;
    }

    const previous = signatures.at(-1);
    if (signature.type === "text" && previous?.type === "text") {
      previous.content = `${previous.content} ${signature.content}`
        .replace(/\s+/g, " ")
        .trim();
    } else {
      signatures.push(signature);
    }
  }

  return signatures;
}

function structureSignature(source) {
  return JSON.stringify(tokenSignatures(markdown.parse(source, {})));
}

function endsWithHardBreak(line) {
  if (/ {2,}$/.test(line)) {
    return true;
  }
  const trailingBackslashes = line.match(/\\+$/)?.[0].length ?? 0;
  return trailingBackslashes % 2 === 1;
}

export function formatMarkdown(source) {
  const hadFinalNewline = source.endsWith("\n");
  const lines = source.replace(/\n$/, "").split("\n");
  const replacements = new Map();
  const frontmatterEnd =
    lines[0]?.trim() === "---"
      ? lines.findIndex((line, index) => index > 0 && line.trim() === "---")
      : -1;

  for (const token of markdown.parse(source, {})) {
    if (
      token.type !== "inline" ||
      !token.map ||
      token.map[1] - token.map[0] <= 1 ||
      token.map[0] <= frontmatterEnd
    ) {
      continue;
    }

    const contentLines = token.content.split("\n");
    if (contentLines.length !== token.map[1] - token.map[0]) {
      continue;
    }

    const groups = [];
    for (const [lineIndex, contentLine] of contentLines.entries()) {
      const previousLine = contentLines[lineIndex - 1];
      const startsNewGroup =
        lineIndex === 0 ||
        endsWithHardBreak(previousLine) ||
        (lineIndex === 1 &&
          /^\[![^\]]+\][+-]?(?:\s+.*)?$/i.test(contentLines[0]));
      if (startsNewGroup) {
        groups.push({ start: lineIndex, content: contentLine });
      } else {
        const group = groups.at(-1);
        if (group) {
          group.content = `${group.content} ${contentLine}`;
        }
      }
    }

    const replacementLines = [];
    for (const group of groups) {
      const sourceLine = lines[token.map[0] + group.start];
      const contentIndex = sourceLine.indexOf(contentLines[group.start]);
      if (contentIndex < 0) {
        replacementLines.length = 0;
        break;
      }
      replacementLines.push(
        `${sourceLine.slice(0, contentIndex)}${group.content}`,
      );
    }
    if (replacementLines.length === 0) {
      continue;
    }

    replacements.set(token.map[0], {
      end: token.map[1],
      lines: replacementLines,
    });
  }

  const outputLines = [];
  for (let index = 0; index < lines.length; index += 1) {
    const replacement = replacements.get(index);
    if (!replacement) {
      outputLines.push(lines[index]);
      continue;
    }
    outputLines.push(...replacement.lines);
    index = replacement.end - 1;
  }

  const output = `${outputLines.join("\n")}${hadFinalNewline ? "\n" : ""}`;
  if (structureSignature(source) !== structureSignature(output)) {
    throw new Error("Markdown structure changed while removing soft wraps");
  }
  return output;
}

async function collectMarkdownFiles(path) {
  const metadata = await stat(path);
  if (metadata.isFile()) {
    return extname(path).toLowerCase() === ".md" ? [path] : [];
  }

  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || skippedDirectories.has(entry.name)) {
      continue;
    }
    const entryPath = join(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(entryPath)));
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") {
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
      targets.map((target) => collectMarkdownFiles(resolve(target))),
    )
  )
    .flat()
    .filter((file, index, all) => all.indexOf(file) === index)
    .sort();
  const changed = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const output = formatMarkdown(source);
    if (output === source) {
      continue;
    }
    changed.push(relative(process.cwd(), file));
    if (!check) {
      await writeFile(file, output, "utf8");
    }
  }

  console.log(
    `${check ? "Would format" : "Formatted"} ${changed.length}/${files.length} Markdown files.`,
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
