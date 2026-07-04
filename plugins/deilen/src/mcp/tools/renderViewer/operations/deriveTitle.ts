import { basename } from "node:path";

const H1_PATTERN = /^#[ \t]+(.+?)[ \t]*#*\s*$/m;
const FILE_EXTENSION_PATTERN = /\.[^.]+$/;

export interface DeriveTitleInput {
  title?: string;
  sourcePath?: string;
  markdown: string;
}

/** Page title: explicit title > first ATX H1 > file base name > "Document". */
export function deriveTitle(input: DeriveTitleInput): string {
  const explicit = input.title?.trim();
  if (explicit) return explicit;
  const h1 = H1_PATTERN.exec(input.markdown);
  if (h1) return h1[1].trim();
  if (input.sourcePath)
    return basename(input.sourcePath).replace(FILE_EXTENSION_PATTERN, "");
  return "Document";
}
