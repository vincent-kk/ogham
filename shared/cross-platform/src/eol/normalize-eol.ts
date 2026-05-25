export function normalizeEol(s: string): string {
  return s.replace(/^﻿/, "").replace(/\r\n/g, "\n");
}
