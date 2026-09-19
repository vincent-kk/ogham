import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  factsExtractorBuildOptions,
  findFactsBundleViolations,
} from '../../../../scripts/factsExtractorBundle.mjs';

/** Package root the build options resolve the entry from. */
const PACKAGE_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** The bundle the build script would write, built in memory. */
let bundle: string;

beforeAll(async () => {
  const result = await esbuild.build({
    ...factsExtractorBuildOptions(PACKAGE_ROOT),
    write: false,
  });
  bundle = result.outputFiles[0].text;
}, 60_000);

describe('the facts extractor bundle starts one process and pulls in no server code', () => {
  it('passes the guard the build script applies', () => {
    expect(
      findFactsBundleViolations(bundle, Buffer.byteLength(bundle)),
    ).toEqual([]);
  });

  it('does not misread an identifier that ends in a process call name, or a RegExp exec', () => {
    const harmless = `${bundle}\nrespawn(1);prefork(2);q.exec(s);reexec(3)`;
    expect(
      findFactsBundleViolations(harmless, Buffer.byteLength(harmless)),
    ).toEqual([]);
  });

  it.each([
    ['a detached spawn', 'x({detached:!0})'],
    ['a second spawnSync call', 'y.spawnSync("sh")'],
    ['execFileSync', 'execFileSync("sh")'],
    ['execSync', 'z.execSync("sh")'],
    ['spawnDetached', 'spawnDetached("sh")'],
    ['a second async spawn call', 'q.spawn("sh")'],
    ['fork', 'q.fork("worker.js")'],
    ['a bare exec call', 'exec("sh")'],
    ['execFile', 'q.execFile("sh")'],
    ['the MCP SDK', '"notifications/initialized"'],
    ['zod', '"ZodError"'],
  ])('fails the guard when the bundle holds %s', (_label, text) => {
    const tampered = `${bundle}\n${text}`;
    expect(
      findFactsBundleViolations(tampered, Buffer.byteLength(tampered)),
    ).not.toEqual([]);
  });
});
