import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform/paths';
import { afterEach, describe, expect, it } from 'vitest';

import { createAdapterRegistry } from '../../../adapters/index.js';
import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import { DETAIL_MD, INTENT_MD } from '../../../constants/documentFiles.js';
import {
  LEGACY_CRITERIA_LEDGER_PATH_COMPONENTS,
  LEGACY_CRITERIA_LEDGER_RULE,
} from '../../../constants/legacyCriteriaLedger.js';
import { createDefaultConfig } from '../../infra/configLoader/index.js';
import { validateStructure } from '../../rules/fractalValidator/index.js';
import { loadBuiltinRules } from '../../rules/ruleEngine/index.js';
import { createProjectSnapshot } from '../index.js';

const ROOT_INTENT = `# fixture
## Purpose
Provide legacy ledger evidence.
## Structure
The root is one fractal.
## Conventions
Prefer exact evidence.
## Boundaries
### Always do
- Preserve evidence.
### Ask first
- Ask before changing the boundary.
### Never do
- Never hide a legacy ledger.
## Dependencies
- None.
`;
const ROOT_DETAIL = `# fixture contract
## Requirements
- Legacy evidence remains observable.
## API Contracts
- The root owns its acceptance contract.
## Acceptance Criteria
### AC-fixture — Observable fixture
- The fixture has one root contract.
## Last Updated
2026-07-27
`;
const INITIAL_LEDGER_CONTENT = '# Legacy criteria\n\n- preserve this claim\n';
const CHANGED_LEDGER_CONTENT = `${INITIAL_LEDGER_CONTENT}- preserve another claim\n`;
const roots: string[] = [];

function createProject(): string {
  const root = mkdtempSync(portableJoin(tmpdir(), 'filid-legacy-ledger-'));
  roots.push(root);
  writeFileSync(portableJoin(root, INTENT_MD), ROOT_INTENT);
  writeFileSync(portableJoin(root, DETAIL_MD), ROOT_DETAIL);
  return root;
}

function writeLegacyLedger(root: string, content: string): string {
  const filidDirectory = portableJoin(
    root,
    LEGACY_CRITERIA_LEDGER_PATH_COMPONENTS.DIRECTORY,
  );
  mkdirSync(filidDirectory, { recursive: true });
  const ledgerPath = portableJoin(
    filidDirectory,
    LEGACY_CRITERIA_LEDGER_PATH_COMPONENTS.BASENAME,
  );
  writeFileSync(ledgerPath, content);
  return ledgerPath;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('legacy criteria ledger snapshot evidence', () => {
  it('returns null evidence and passes the project rule when the ledger is absent', async () => {
    const root = createProject();
    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig('English'),
    );
    const rule = loadBuiltinRules().find(
      (candidate) => candidate.id === BUILTIN_RULE_IDS.LEGACY_CRITERIA_LEDGER,
    );

    expect(snapshot.legacyCriteriaLedger).toBeNull();
    expect(rule).toMatchObject({
      granularity: LEGACY_CRITERIA_LEDGER_RULE.GRANULARITY,
    });
    expect(validateStructure(snapshot, [rule!]).result.violations).toEqual([]);
  });

  it('reports exact evidence, a violation, and the root DETAIL migration target', async () => {
    const root = createProject();
    const ledgerPath = writeLegacyLedger(root, INITIAL_LEDGER_CONTENT);
    const targetDetailPath = portableJoin(root, DETAIL_MD);
    const snapshot = await createProjectSnapshot(
      root,
      createAdapterRegistry(),
      createDefaultConfig('English'),
    );
    const rule = loadBuiltinRules().find(
      (candidate) => candidate.id === BUILTIN_RULE_IDS.LEGACY_CRITERIA_LEDGER,
    );

    expect(snapshot.legacyCriteriaLedger).toEqual({
      path: ledgerPath,
      targetDetailPath,
    });
    expect(validateStructure(snapshot, [rule!]).result.violations).toEqual([
      expect.objectContaining({
        ruleId: BUILTIN_RULE_IDS.LEGACY_CRITERIA_LEDGER,
        severity: LEGACY_CRITERIA_LEDGER_RULE.SEVERITY,
        path: ledgerPath,
        suggestion: expect.stringContaining(targetDetailPath),
        certainty: ANALYSIS_CERTAINTIES.EXACT,
      }),
    ]);
  });

  it('changes the snapshot hash when only legacy ledger content changes', async () => {
    const root = createProject();
    const ledgerPath = writeLegacyLedger(root, INITIAL_LEDGER_CONTENT);
    const registry = createAdapterRegistry();
    const config = createDefaultConfig('English');
    const before = await createProjectSnapshot(root, registry, config);

    writeFileSync(ledgerPath, CHANGED_LEDGER_CONTENT);
    const after = await createProjectSnapshot(root, registry, config);

    expect(after.snapshotHash).not.toBe(before.snapshotHash);
  });

  it('keeps the hash for equivalent legacy ledgers at different roots', async () => {
    const firstRoot = createProject();
    const secondRoot = createProject();
    writeLegacyLedger(firstRoot, INITIAL_LEDGER_CONTENT);
    writeLegacyLedger(secondRoot, INITIAL_LEDGER_CONTENT);
    const registry = createAdapterRegistry();
    const config = createDefaultConfig('English');

    const first = await createProjectSnapshot(firstRoot, registry, config);
    const second = await createProjectSnapshot(secondRoot, registry, config);

    expect(first.snapshotHash).toBe(second.snapshotHash);
  });
});
