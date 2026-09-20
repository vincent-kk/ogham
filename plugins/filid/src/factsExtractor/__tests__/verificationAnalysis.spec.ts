import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

import { ecmascriptVerificationAdapter } from '../../adapters/ecmascript/index.js';
import { evaluateVerificationPolicy } from '../../core/verification/index.js';
import { scanSource } from '../analysis/scanSource.js';
import { verificationFromSource } from '../analysis/verification/verificationFromSource.js';
import { extractContractGroupIds } from '../analysis/verification/extractContractGroupIds.js';

/** A static table of 16 rows: the count the cap rejects for a spec document. */
const ROWS = `it.each([${Array.from({ length: 16 }, (_, index) => index).join(',')}])('row', () => {});`;

/** A table whose rows a reader cannot count without running the program. */
const DYNAMIC = "it.each(loadRows())('row', () => {});";

const roots: string[] = [];

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-verification-adapter-'));
  roots.push(root);
  return root;
}

function write(root: string, relativePath: string, content = ''): string {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return path;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/**
 * The reading the extractor makes for one file's record.
 *
 * The name proposes the role and the scan of the text confirms it; both answers
 * come from the same count.
 * @param path Path whose name proposes the role.
 * @param content The file's text.
 * @returns The confirmed role and its case count.
 */
function readingOf(path: string, content: string) {
  return verificationFromSource(path, scanSource(content));
}

describe('what makes a file a verification file', () => {
  it('classifies spec and test files by verification role', async () => {
    const root = project();
    const body = "it('works', () => {});";
    const spec = write(root, 'a.spec.ts', body);
    const test = write(root, 'a.test.js', body);

    expect(readingOf(spec, body).role).toBe('spec-document');
    expect(readingOf(test, body).role).toBe('test-record');
  });

  it('denies the role to a candidate holding no verification cases', async () => {
    const root = project();
    const body = "import { a } from '../other/internal/deep.js';\nexport const b = a + 1;\n";
    const impostor = write(root, 'src/impostor.spec.ts', body);
    write(root, 'src/real.spec.ts', "it('works', () => {});");

    // Renaming production code to *.spec.ts must not buy a boundary exemption.
    // The name is all discovery reads, so the name proposes this file; what
    // denies it the exemption is the role, which comes from the content.
    expect(readingOf(impostor, body).role).toBe('unsupported');
    expect(await ecmascriptVerificationAdapter.discover(root)).toContain(
      impostor,
    );
  });

  it('keeps a candidate whose case count is indeterminate', async () => {
    const root = project();
    const body = "it.each(loadRows())('row', () => {});";
    const dynamic = write(root, 'src/dynamic.spec.ts', body);

    // Uncountable is not the same as absent.
    expect(readingOf(dynamic, body).role).toBe('spec-document');
    expect(await ecmascriptVerificationAdapter.discover(root)).toContain(
      dynamic,
    );
  });

  it('keeps the role of a test holding a regex literal with an unpaired quote', async () => {
    const root = project();
    const body =
      "const QUOTE = /[\"']/;\n\ntest('case 1', () => { assert.ok(QUOTE.test('\"')); });\ntest('case 2', () => { assert.ok(true); });\n";
    const quoted = write(root, 'src/two.test.ts', body);

    expect(readingOf(quoted, body).role).toBe('test-record');
    expect(await ecmascriptVerificationAdapter.discover(root)).toContain(
      quoted,
    );
  });

  it('denies the role when a JSX apostrophe hides no case', async () => {
    const root = project();
    const body = "export const Note = () => <p>Don't {dep}</p>;\n";
    const renamed = write(root, 'src/Note.test.tsx', body);

    // An apostrophe in JSX text must not buy the exemption a rename cannot.
    expect(readingOf(renamed, body).role).toBe('unsupported');
  });

  it('refuses an extension it does not verify, whatever the text holds', async () => {
    // The name decides first: text that would confirm a role elsewhere buys
    // nothing here, and no count is attempted.
    const reading = readingOf('/p/a.contract', "it('works', () => {});");

    expect(reading.role).toBe('unsupported');
    expect(reading.cases).toEqual(
      expect.objectContaining({ certainty: 'unsupported' }),
    );
  });

  it('discovers supported verification files and excludes dependency dirs', async () => {
    const root = project();
    const spec = write(root, 'src/feature.spec.ts', "it('works', () => {});");
    const test = write(root, 'src/feature.test.ts', "it('works', () => {});");
    write(root, 'node_modules/pkg/ignored.test.js', "it('ignored', () => {});");
    write(root, 'src/source.ts', 'export {};');

    expect(await ecmascriptVerificationAdapter.discover(root)).toEqual([
      spec,
      test,
    ]);
  });

  it('counts 16 static parameter rows and policy rejects the spec', async () => {
    const root = project();
    const path = write(
      root,
      'src/rows.spec.ts',
      ROWS,
    );
    const count = readingOf(path, ROWS).cases;

    expect(count).toMatchObject({
      certainty: 'exact',
      exactCount: 16,
      knownLowerBound: 16,
    });
    const result = evaluateVerificationPolicy(
      [
        {
          path,
          adapterId: ecmascriptVerificationAdapter.id,
          role: 'spec-document',
          count,
          ownerFractalPath: join(root, 'src'),
          contractGroupIds: [],
        },
      ],
      root,
    );
    expect(result.violations).toContainEqual(
      expect.objectContaining({ ruleId: 'spec-document-case-cap' }),
    );
  });

  it('returns indeterminate for a dynamic parameter table', async () => {
    const root = project();
    const path = write(
      root,
      'src/dynamic.spec.ts',
      DYNAMIC,
    );

    expect(readingOf(path, DYNAMIC).cases).toEqual(
      expect.objectContaining({
        certainty: 'indeterminate',
        exactCount: undefined,
      }),
    );
  });

  it('extracts unique contract markers from comments only', async () => {
    const root = project();
    const path = write(
      root,
      'src/contracts.spec.ts',
      [
        '// filid:contract AC-create',
        '/* filid:contract AC-delete */',
        "const ignored = 'filid:contract AC-string';",
        '// filid:contract AC-create',
        "it('holds a case, as a spec-document must', () => {});",
      ].join('\n'),
    );

    expect(extractContractGroupIds(readFileSync(path, 'utf8'))).toEqual([
      'AC-create',
      'AC-delete',
    ]);
  });

  it('reuses structure detection evidence', async () => {
    const root = project();
    write(root, 'src/feature.spec.ts', "it('works', () => {});");

    expect(
      (await ecmascriptVerificationAdapter.detect(root)).confidence,
    ).toBeGreaterThan(0);
  });
});
