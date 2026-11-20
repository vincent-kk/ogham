import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import type { InterventionLevel } from '../../../../types/config.js';

import { isInterventionLevel } from './isInterventionLevel.js';

/** A dial file's contents, or why it could not be used as written. */
export interface DialFileResult {
  intervention: InterventionLevel | null;
  /**
   * Absent when the file simply does not exist — the normal state for a
   * project that has not run setup. Present only when something was there
   * and had to be ignored, phrased to follow an em dash in a render.
   */
  reason?: string;
}

/**
 * Read one dial file. Never throws.
 *
 * Both stored layers hold the same one-key object, so both parse through
 * here. Absence and damage stay distinguishable: only damage sets
 * `reason`, which is what lets a render say the file was ignored instead
 * of quietly showing the fallback as if it had been chosen.
 */
export function readDialFile(path: string): DialFileResult {
  let raw: string | null;
  try {
    raw = readUtf8FileIfExistsSync(path);
  } catch {
    return { intervention: null };
  }

  if (raw === null) return { intervention: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { intervention: null, reason: 'not valid JSON' };
  }

  if (typeof parsed !== 'object' || parsed === null)
    return { intervention: null, reason: 'not a JSON object' };

  const { intervention } = parsed as { intervention?: unknown };
  if (!isInterventionLevel(intervention))
    return {
      intervention: null,
      reason: 'unknown intervention level',
    };

  return { intervention };
}
