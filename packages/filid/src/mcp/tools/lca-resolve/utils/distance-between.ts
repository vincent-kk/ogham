import { pathDepth } from './path-depth.js';

export function distanceBetween(from: string, to: string): number {
  const fromDepth = pathDepth(from);
  const toDepth = pathDepth(to);
  return Math.abs(fromDepth - toDepth);
}
