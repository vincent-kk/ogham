import { homedir } from "node:os";

export function home(): string {
  return homedir();
}
