import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** Files whose parsing the adapter cannot fully trust, one shape each. */
const UNCERTAINTY_FILES: Readonly<Record<string, string>> = {
  'a.ts': 'export const a = 1;\n',
  'b.ts': 'export const b = 2;\n',
  'jsxApostrophe.tsx':
    "const s = <p>Don't</p>; const lazy = () => import('./a.ts');\nimport { b } from './b.ts';\n",
  'unclosedString.ts':
    "const broken = 'never closed;\nimport { a } from './a.js';\n",
  'regexLiteral.ts':
    "const quote = /'/g;\nimport { a } from './a.js';\nexport const q = quote;\n",
  'templateLiteral.ts':
    "export const text = `import { a } from './a.js'`;\nimport { b } from './b.js';\n",
  'typeOnly.ts': "import type { A } from './a.js';\nexport type B = A;\n",
  'reExport.ts':
    "export * from './a.js';\nexport { b } from './b.js';\nexport { gone } from './gone.js';\n",
  'dynamicImport.ts':
    "const name = './a.js';\nexport const lazy = () => import(name);\nexport const eager = () => import('./b.js');\n",
  'index.ts':
    "export * from './a.js';\nexport { b as renamed } from './b.js';\nexport const direct = 1;\nexport default direct;\n",
  'cases.test.ts':
    "import { describe, it, expect } from 'vitest';\n\ndescribe('outer', () => {\n  describe('inner', () => {\n    it.each([[1], [2], [3]])('row %s', (n) => expect(n).toBeTruthy());\n    it('single', () => expect(1).toBe(1));\n  });\n});\n",
  'dynamicTable.spec.ts':
    "import { it } from 'vitest';\n\nconst rows = [1, 2].map((n) => [n]);\nit.each(rows)('row %s', () => {});\n",
  'notATest.test.ts': 'export const notATest = 1;\n',
};

/**
 * Write a temporary project with one file per parsing uncertainty the adapter reports.
 * @returns Absolute project root; the caller removes it.
 */
export function writeUncertaintyProject(): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-facts-uncertainty-'));
  for (const [path, content] of Object.entries(UNCERTAINTY_FILES)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}
