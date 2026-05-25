import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface ShimOptions {
  outputPath: string;
  nodeRelativePath?: string;
  scriptRelativePath: string;
}

export function generateWindowsCmd(opts: ShimOptions): void {
  const nodePath = opts.nodeRelativePath ?? "node.exe";
  const content =
    "@echo off\r\n" +
    `"%~dp0${nodePath}" "%~dp0${opts.scriptRelativePath}" %*\r\n`;
  mkdirSync(dirname(opts.outputPath), { recursive: true });
  writeFileSync(opts.outputPath, content, "utf8");
}
