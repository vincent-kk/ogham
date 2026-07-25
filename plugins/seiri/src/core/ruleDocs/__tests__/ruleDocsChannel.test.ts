import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  mergeSection,
  readSection,
  sectionMarkers,
} from '@ogham/cross-platform/instructions';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadManifest } from '../loaders/loadManifest.js';
import { getRuleDocsStatus } from '../status/getRuleDocsStatus.js';
import { applyRuleDocs } from '../sync/applyRuleDocs.js';
import { planRuleDocs } from '../sync/planRuleDocs.js';

const pluginRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const anchor = loadManifest(pluginRoot).rules[0];
const templatePath = join(pluginRoot, 'templates', 'rules', anchor.filename);
const templateBody = readFileSync(templatePath, 'utf8');
const markers = sectionMarkers('SEIRI', anchor.filename);

describe('rule docs host channel', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'seiri-rule-channel-'));
    mkdirSync(join(projectRoot, '.git'));
    delete process.env.OGHAM_HOST;
  });

  afterEach(() => {
    delete process.env.OGHAM_HOST;
    rmSync(projectRoot, { recursive: true, force: true });
  });

  const rulesPath = (): string =>
    join(projectRoot, '.claude', 'rules', anchor.filename);
  const agentsPath = (): string => join(projectRoot, 'AGENTS.md');
  const outcome = (
    result: ReturnType<typeof applyRuleDocs>,
  ): string | undefined =>
    result.outcomes.find((entry) => entry.id === anchor.id)?.action;

  it('keeps Claude on its one-file-per-rule directory channel', () => {
    const result = applyRuleDocs(projectRoot, pluginRoot, [anchor.id]);

    expect(outcome(result)).toBe('copy');
    expect(readFileSync(rulesPath(), 'utf8')).toBe(templateBody);
    expect(existsSync(agentsPath())).toBe(false);
  });

  it('is idempotent when a Claude rule already matches its template', () => {
    applyRuleDocs(projectRoot, pluginRoot, [anchor.id]);
    const once = readFileSync(rulesPath(), 'utf8');

    const result = applyRuleDocs(projectRoot, pluginRoot, [anchor.id]);

    expect(outcome(result)).toBe('unchanged');
    expect(readFileSync(rulesPath(), 'utf8')).toBe(once);
  });

  it('preserves Claude drift until the caller explicitly resyncs it', () => {
    applyRuleDocs(projectRoot, pluginRoot, [anchor.id]);
    writeFileSync(rulesPath(), '# locally edited\n', 'utf8');

    const drift = applyRuleDocs(projectRoot, pluginRoot, [anchor.id]);

    expect(outcome(drift)).toBe('drift');
    expect(readFileSync(rulesPath(), 'utf8')).toBe('# locally edited\n');

    const resynced = applyRuleDocs(projectRoot, pluginRoot, [anchor.id], {
      resync: [anchor.id],
    });
    expect(outcome(resynced)).toBe('update');
    expect(readFileSync(rulesPath(), 'utf8')).toBe(templateBody);
  });

  it('deploys a Codex rule into AGENTS.md instead of the ignored Claude directory', () => {
    process.env.OGHAM_HOST = 'codex';

    applyRuleDocs(projectRoot, pluginRoot, [anchor.id]);

    expect(existsSync(rulesPath())).toBe(false);
    expect(existsSync(agentsPath())).toBe(true);
    expect(readSection(readFileSync(agentsPath(), 'utf8'), markers)).toBe(
      templateBody.trim(),
    );
  });

  it('reports the Codex deployment from the shared target display path', () => {
    process.env.OGHAM_HOST = 'codex';
    applyRuleDocs(projectRoot, pluginRoot, [anchor.id]);

    const status = getRuleDocsStatus(projectRoot, pluginRoot).find(
      (entry) => entry.id === anchor.id,
    );

    expect(status).toMatchObject({
      deployed: true,
      inSync: true,
      displayTarget: 'AGENTS.md',
      source: 'current',
    });
    expect(status?.deployedHash).toBe(status?.templateHash);
  });

  it('previews the Codex channel without writing and returns a revision', () => {
    process.env.OGHAM_HOST = 'codex';

    const plan = planRuleDocs(projectRoot, pluginRoot, [anchor.id]);

    expect(plan.applied).toBe(false);
    expect(plan.revision).toEqual(expect.any(String));
    expect(plan.outcomes.find((entry) => entry.id === anchor.id)).toMatchObject(
      {
        action: 'copy',
      },
    );
    expect(existsSync(rulesPath())).toBe(false);
    expect(existsSync(agentsPath())).toBe(false);
  });

  it('reports a fresh lock conflict as unapplied without writing the rule', () => {
    const preview = planRuleDocs(projectRoot, pluginRoot, [anchor.id]);
    const lockPath = join(
      projectRoot,
      '.claude',
      'rules',
      '.ogham-agent-rules.lock',
    );
    mkdirSync(lockPath, { recursive: true });

    const result = applyRuleDocs(projectRoot, pluginRoot, [anchor.id], {
      revision: preview.revision,
    });

    expect(result.applied).toBe(false);
    expect(
      result.outcomes.find((entry) => entry.id === anchor.id),
    ).toMatchObject({
      action: 'skip',
      reason: 'lock',
    });
    expect(existsSync(rulesPath())).toBe(false);
  });

  it('reports an apply-time revision conflict as unapplied without overwriting newer bytes', () => {
    const preview = planRuleDocs(projectRoot, pluginRoot, [anchor.id]);
    const concurrentBody = '# Concurrent user edit\n';
    const options = {
      get revision(): string | undefined {
        mkdirSync(join(projectRoot, '.claude', 'rules'), { recursive: true });
        writeFileSync(rulesPath(), concurrentBody, 'utf8');
        return preview.revision;
      },
    };

    const result = applyRuleDocs(projectRoot, pluginRoot, [anchor.id], options);

    expect(result.applied).toBe(false);
    expect(
      result.outcomes.find((entry) => entry.id === anchor.id),
    ).toMatchObject({
      action: 'skip',
      reason: 'revision',
    });
    expect(readFileSync(rulesPath(), 'utf8')).toBe(concurrentBody);
  });

  it('preserves user text, drift, and idempotency on the Codex channel', () => {
    process.env.OGHAM_HOST = 'codex';
    const userText = '# House rules\n\nKeep  these  spaces.\n';
    writeFileSync(agentsPath(), userText, 'utf8');

    applyRuleDocs(projectRoot, pluginRoot, [anchor.id]);
    expect(existsSync(rulesPath())).toBe(false);
    const once = readFileSync(agentsPath(), 'utf8');
    expect(once.slice(0, userText.length)).toBe(userText);

    const unchanged = applyRuleDocs(projectRoot, pluginRoot, [anchor.id]);
    expect(outcome(unchanged)).toBe('unchanged');
    expect(readFileSync(agentsPath(), 'utf8')).toBe(once);

    const edited = mergeSection(once, markers, '# locally edited');
    writeFileSync(agentsPath(), edited, 'utf8');
    const drift = applyRuleDocs(projectRoot, pluginRoot, [anchor.id]);
    expect(outcome(drift)).toBe('drift');
    expect(readSection(readFileSync(agentsPath(), 'utf8'), markers)).toBe(
      '# locally edited',
    );

    const resynced = applyRuleDocs(projectRoot, pluginRoot, [anchor.id], {
      resync: [anchor.id],
    });
    expect(outcome(resynced)).toBe('update');
    expect(readSection(readFileSync(agentsPath(), 'utf8'), markers)).toBe(
      templateBody.trim(),
    );
  });

  it('uses a non-empty Codex override as the effective project target', () => {
    process.env.OGHAM_HOST = 'codex';
    const overridePath = join(projectRoot, 'AGENTS.override.md');
    writeFileSync(agentsPath(), '# Default instructions\n', 'utf8');
    writeFileSync(overridePath, '# Override instructions\n', 'utf8');

    applyRuleDocs(projectRoot, pluginRoot, [anchor.id]);
    const status = getRuleDocsStatus(projectRoot, pluginRoot).find(
      (entry) => entry.id === anchor.id,
    );

    expect(readSection(readFileSync(overridePath, 'utf8'), markers)).toBe(
      templateBody.trim(),
    );
    expect(readFileSync(agentsPath(), 'utf8')).toBe('# Default instructions\n');
    expect(status?.displayTarget).toBe('AGENTS.override.md');
  });

  it('keeps a rule hidden by a later Codex override selected but not active', () => {
    process.env.OGHAM_HOST = 'codex';
    applyRuleDocs(projectRoot, pluginRoot, [anchor.id]);
    writeFileSync(
      join(projectRoot, 'AGENTS.override.md'),
      '# Active override\n',
      'utf8',
    );

    const status = getRuleDocsStatus(projectRoot, pluginRoot).find(
      (entry) => entry.id === anchor.id,
    );
    const plan = planRuleDocs(projectRoot, pluginRoot, [anchor.id]);

    expect(status).toMatchObject({
      deployed: true,
      displayTarget: 'AGENTS.md',
      source: 'current',
      inSync: true,
      active: false,
      activeDisplayTarget: 'AGENTS.override.md',
      activeSource: null,
      activeDeployedHash: null,
      activeInSync: false,
    });
    expect(status?.deployedHash).toBe(status?.templateHash);
    expect(plan.outcomes.find((entry) => entry.id === anchor.id)).toMatchObject(
      {
        action: 'update',
        reason: 'relocated to the active host target',
      },
    );

    const hidden = readFileSync(agentsPath(), 'utf8');
    writeFileSync(
      agentsPath(),
      mergeSection(hidden, markers, '# Hidden local edit'),
      'utf8',
    );
    const driftStatus = getRuleDocsStatus(projectRoot, pluginRoot).find(
      (entry) => entry.id === anchor.id,
    );
    const driftPlan = planRuleDocs(projectRoot, pluginRoot, [anchor.id]);

    expect(driftStatus).toMatchObject({
      deployed: true,
      inSync: false,
      active: false,
      activeInSync: false,
    });
    expect(
      driftPlan.outcomes.find((entry) => entry.id === anchor.id),
    ).toMatchObject({ action: 'drift' });
  });

  it('retires only orphan sections in the explicit Seiri owner namespace', () => {
    process.env.OGHAM_HOST = 'codex';
    const retired = sectionMarkers('SEIRI', 'seiri_retired-rule.md');
    const foreign = sectionMarkers('FILID', 'filid_retired-rule.md');
    const userText = '# User-owned preface\n';
    const withRetired = mergeSection(userText, retired, '# retired');
    writeFileSync(
      agentsPath(),
      mergeSection(withRetired, foreign, '# foreign'),
      'utf8',
    );

    const result = applyRuleDocs(projectRoot, pluginRoot, [anchor.id]);
    const source = readFileSync(agentsPath(), 'utf8');

    expect(readSection(source, retired)).toBeNull();
    expect(readSection(source, foreign)).toBe('# foreign');
    expect(source.startsWith(userText)).toBe(true);
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        filename: 'seiri_retired-rule.md',
        action: 'remove',
      }),
    );
  });
});
