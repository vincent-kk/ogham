export function isWindowsLikePath(p: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(p) || /^\\\\[.?]\\/.test(p) || /^\\\\/.test(p);
}
