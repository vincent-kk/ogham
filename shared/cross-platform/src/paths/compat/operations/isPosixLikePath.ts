export function isPosixLikePath(p: string): boolean {
  return p.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(p);
}
