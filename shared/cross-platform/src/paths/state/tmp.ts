import { tmpdir } from "node:os";

export function tmp(): string {
  return tmpdir();
}
