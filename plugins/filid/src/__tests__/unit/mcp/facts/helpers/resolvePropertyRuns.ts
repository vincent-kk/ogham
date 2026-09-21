/**
 * @file resolvePropertyRuns.ts
 * @description Reads `FILID_PROPERTY_RUNS`, the one knob a model-based test
 * takes from the environment. Every other budget stays in the test.
 */

/** The most runs the environment may ask for. */
export const PROPERTY_RUNS_CAP = 200;

/** Only a plain decimal count is a request; anything else is a typo. */
const COUNT = /^\d+$/;

/**
 * How many scenarios a model-based test runs this time.
 *
 * The default is what the suite always runs, so an ordinary run is unchanged
 * and CI stays predictable. A sweep raises it by setting the variable, and the
 * cap keeps the run finite: a property test that never ends is not a check.
 * Anything unparseable, zero, or past the cap is a mistake at the keyboard
 * rather than a request, and the default answers it.
 *
 * @param fallback - Runs the test asks for when the environment says nothing.
 * @returns The run count to use, between 1 and `PROPERTY_RUNS_CAP`.
 */
export function resolvePropertyRuns(fallback: number): number {
  const requested = process.env.FILID_PROPERTY_RUNS;
  if (requested === undefined || !COUNT.test(requested)) return fallback;
  const parsed = Number.parseInt(requested, 10);
  return parsed >= 1 && parsed <= PROPERTY_RUNS_CAP ? parsed : fallback;
}
