import { appendFileSync } from "node:fs";

/**
 * Appends the plan to the GitHub Actions step-output file as one line per key.
 *
 * Lists are comma-joined so a step can pass them straight to `--only=` and
 * test an empty list with `!= ''`; booleans become `true` / `false`.
 *
 * @param {string} outputPath Value of `$GITHUB_OUTPUT`.
 * @param {import("./computeCiPlan.mjs").CiPlan} plan Plan to publish.
 * @returns {void}
 * @throws When a value contains a line break, which would let it forge further outputs.
 */
export function writeGithubOutput(outputPath, plan) {
  const lines = Object.entries(plan).map(
    ([key, value]) =>
      `${key}=${Array.isArray(value) ? value.join(",") : value}`,
  );
  const forged = lines.find((line) => /[\r\n]/.test(line));
  if (forged) throw new Error(`Refusing multi-line output: ${forged}`);
  appendFileSync(outputPath, `${lines.join("\n")}\n`);
}
