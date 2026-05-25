import path from 'node:path';

export function isPosixLikePath(p: string): boolean {
  return p.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(p);
}

function apiFor(...paths: string[]): typeof path.posix | typeof path {
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

export function samePath(a: string, b: string): boolean {
  return a.replace(/\\/g, '/') === b.replace(/\\/g, '/');
}
