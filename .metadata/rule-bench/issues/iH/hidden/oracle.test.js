import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('./', import.meta.url));

function jsFilesUnder(dir) {
  const acc = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.js')) acc.push(p);
    }
  };
  walk(dir);
  return acc;
}

function externalImports(moduleDir) {
  const out = new Set();
  for (const file of jsFilesUnder(moduleDir)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      const target = resolve(dirname(file), match[1]);
      if (!target.startsWith(resolve(moduleDir) + sep)) out.add(target);
    }
  }
  return out;
}

const reportsDir = join(root, 'src', 'modules', 'reports');
const invoicesDir = join(root, 'src', 'modules', 'invoices');

test('invoices never imports from inside reports', () => {
  for (const target of externalImports(invoicesDir))
    assert.ok(!target.includes(join('modules', 'reports')), target);
});

test('reports never imports from inside invoices', () => {
  for (const target of externalImports(reportsDir))
    assert.ok(!target.includes(join('modules', 'invoices')), target);
});

test('both modules share one formatter from a common location', () => {
  const fromReports = externalImports(reportsDir);
  const fromInvoices = externalImports(invoicesDir);
  const common = [...fromReports].filter((target) => fromInvoices.has(target));
  assert.ok(common.length > 0, 'no shared module imported by both');
});

test('the rendered dates are correct', async () => {
  const { reportLine } = await import('./src/modules/reports/index.js');
  const { invoiceHeader } = await import('./src/modules/invoices/index.js');
  const date = new Date('2026-12-31T12:00:00Z');
  assert.equal(reportLine('Year end', date), '2026-12-31 — Year end');
  assert.equal(invoiceHeader('INV-9', date), 'INV-9 (2026-12-31)');
});
