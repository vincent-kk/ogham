import { readUtf8FileIfExistsSync } from "@ogham/cross-platform/filesystem/read/utf8";

export function effectiveInstructionFile(
  overridePath: string,
  defaultPath: string,
): string {
  const override = readUtf8FileIfExistsSync(overridePath);
  return override !== null && override.trim() !== ""
    ? overridePath
    : defaultPath;
}
