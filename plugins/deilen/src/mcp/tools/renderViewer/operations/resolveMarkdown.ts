import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

export interface ResolveMarkdownInput {
  content?: string;
  path?: string;
}

export interface ResolvedMarkdown {
  markdown: string;
  sourcePath?: string;
}

const MB = 1024 * 1024;

/**
 * Resolve viewer markdown from exactly one of `content`/`path`, enforcing the
 * max_viewer_mb cap. The caller (Claude) is a trusted fs principal, so any
 * readable regular file is allowed after canonicalization + utf8 read.
 *
 * A relative `path` resolves against `workspace`, never `process.cwd()` — off
 * Claude the process runs from the plugin's install directory.
 */
export async function resolveMarkdown(
  input: ResolveMarkdownInput,
  workspace: string,
  maxViewerMb: number,
): Promise<ResolvedMarkdown> {
  const hasContent = typeof input.content === "string";
  const hasPath = typeof input.path === "string" && input.path.length > 0;
  if (hasContent === hasPath)
    throw new Error("invalid_input: provide exactly one of content or path");

  const maxBytes = maxViewerMb * MB;

  if (hasContent) {
    const content = input.content as string;
    if (Buffer.byteLength(content, "utf8") > maxBytes)
      throw new Error(
        `invalid_input: content exceeds max_viewer_mb (${maxViewerMb}MB)`,
      );

    return { markdown: content };
  }

  const sourcePath = resolve(workspace, input.path as string);
  let info;
  try {
    info = await stat(sourcePath);
  } catch (err) {
    throw new Error(
      `read_error: cannot stat ${sourcePath}: ${(err as Error).message}`,
      { cause: err },
    );
  }
  if (!info.isFile())
    throw new Error(`read_error: not a regular file: ${sourcePath}`);

  if (info.size > maxBytes)
    throw new Error(
      `read_error: ${sourcePath} exceeds max_viewer_mb (${maxViewerMb}MB)`,
    );

  try {
    return { markdown: await readFile(sourcePath, "utf8"), sourcePath };
  } catch (err) {
    throw new Error(
      `read_error: cannot read ${sourcePath}: ${(err as Error).message}`,
      { cause: err },
    );
  }
}
