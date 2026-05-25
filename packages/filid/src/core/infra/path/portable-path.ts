import path from 'node:path';

type PathApi = typeof path.win32 | typeof path.posix | typeof path;

export function isPosixLikePath(p: string): boolean {
  return p.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(p);
}

export function isWindowsLikePath(p: string): boolean {
  return (
    /^[A-Za-z]:[\\/]/.test(p) || /^\\\\[.?]\\/.test(p) || /^\\\\/.test(p)
  );
}

function apiFor(...paths: string[]): PathApi {
  if (paths.some(isWindowsLikePath)) return path.win32;
  return paths.some(isPosixLikePath) ? path.posix : path;
}

export function portableBasename(p: string): string {
  return apiFor(p).basename(p);
}

export function portableDirname(p: string): string {
  return apiFor(p).dirname(p);
}

export function portableJoin(...parts: string[]): string {
  return apiFor(...parts).join(...parts);
}

export function portableResolve(...parts: string[]): string {
  return apiFor(...parts).resolve(...parts);
}

export function portableRelative(from: string, to: string): string {
  return apiFor(from, to).relative(from, to);
}

export function pathForCompare(p: string): string {
  const normalized = p.replace(/\\/g, '/');
  return isWindowsLikePath(p) ? normalized.toLowerCase() : normalized;
}

export function samePath(a: string, b: string): boolean {
  return pathForCompare(a) === pathForCompare(b);
}
