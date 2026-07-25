import { copyFileSync as copyFile } from "node:fs";

export function copyFileSync(sourcePath: string, targetPath: string): void {
  copyFile(sourcePath, targetPath);
}
