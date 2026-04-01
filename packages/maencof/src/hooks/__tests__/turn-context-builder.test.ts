import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { writePinnedNodes } from '../cache-manager.js';
import type { PinnedNode } from '../cache-manager.js';
import {
  buildTurnContext,
  readCompanionIdentity,
  readIndexMetadata,
  readStaleCount,
} from '../turn-context-builder.js';

let vaultDir: string;
let cacheTestDir: string;

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-tc-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  cacheTestDir = join(
    tmpdir(),
    `maencof-tc-cache-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  vi.stubEnv('CLAUDE_CONFIG_DIR', cacheTestDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function writeIndex(nodes: Array<{ layer?: number; domain?: string }>): void {
  writeFileSync(
    join(vaultDir, '.maencof', 'index.json'),
    JSON.stringify({ nodes }),
    'utf-8',
  );
}

function writeStaleNodes(paths: string[]): void {
  writeFileSync(
    join(vaultDir, '.maencof', 'stale-nodes.json'),
    JSON.stringify({ paths, updatedAt: new Date().toISOString() }),
    'utf-8',
  );
}

interface CompanionData {
  name: string;
  greeting?: string;
  schema_version?: number;
  role?: string;
  personality?: {
    tone?: string;
    approach?: string;
    traits?: string[];
  };
  principles?: string[];
}

function writeCompanion(nameOrData: string | CompanionData): void {
  const data =
    typeof nameOrData === 'string'
      ? { schema_version: 1, name: nameOrData, greeting: 'Hello' }
      : { schema_version: 1, greeting: 'Hello', ...nameOrData };
  writeFileSync(
    join(vaultDir, '.maencof-meta', 'companion-identity.json'),
    JSON.stringify(data),
    'utf-8',
  );
}

describe('readIndexMetadata', () => {
  it('returns zeros when index.json missing', () => {
    const result = readIndexMetadata('/nonexistent');
    expect(result.totalNodes).toBe(0);
    expect(result.layerCounts).toEqual({});
  });

  it('counts nodes by layer', () => {
    writeIndex([
      { layer: 1 },
      { layer: 1 },
      { layer: 3 },
      { layer: 3 },
      { layer: 3 },
      { layer: 5 },
    ]);
    const result = readIndexMetadata(vaultDir);
    expect(result.totalNodes).toBe(6);
    expect(result.layerCounts[1]).toBe(2);
    expect(result.layerCounts[3]).toBe(3);
    expect(result.layerCounts[5]).toBe(1);
  });
});

describe('readStaleCount', () => {
  it('returns 0 when file missing', () => {
    expect(readStaleCount('/nonexistent')).toBe(0);
  });

  it('returns correct count', () => {
    writeStaleNodes(['/a.md', '/b.md']);
    expect(readStaleCount(vaultDir)).toBe(2);
  });
});

describe('buildTurnContext', () => {
  it('produces <kg-core> XML tag with node count and layer distribution', () => {
    writeIndex([{ layer: 1 }, { layer: 2 }, { layer: 3 }]);
    const result = buildTurnContext(vaultDir);
    expect(result).toContain('<kg-core');
    expect(result).toContain('nodes="3"');
    expect(result).toContain('layers="L1:1,L2:1,L3:1,L4:0,L5:0"');
    expect(result).toContain('</kg-core>');
  });

  it('produces <kg-directive> with English exploration instructions', () => {
    const result = buildTurnContext(vaultDir);
    expect(result).toContain('<kg-directive>');
    expect(result).toContain('kg_search');
    expect(result).toContain('kg_navigate');
    expect(result).toContain('</kg-directive>');
  });

  it('handles missing index.json gracefully', () => {
    const result = buildTurnContext('/nonexistent/vault');
    expect(result).toContain('nodes="0"');
    expect(result).toContain('fresh="100%"');
  });

  it('includes pinned nodes as comma-separated titles', () => {
    const nodes: PinnedNode[] = [
      {
        id: 'n1',
        title: 'Architecture',
        layer: 1,
        pinnedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'n2',
        title: 'Interview Prep',
        layer: 3,
        pinnedAt: '2026-01-02T00:00:00Z',
      },
    ];
    writePinnedNodes(vaultDir, nodes);
    const result = buildTurnContext(vaultDir);
    expect(result).toContain('<pinned>Architecture,Interview Prep</pinned>');
  });

  it('shows empty pinned tag when no nodes pinned', () => {
    const result = buildTurnContext(vaultDir);
    expect(result).toContain('<pinned></pinned>');
  });

  it('appends <kg-stale-advisory> when stale ratio >10%', () => {
    writeIndex(Array.from({ length: 10 }, (_, i) => ({ layer: 1 })));
    writeStaleNodes(['/a.md', '/b.md']); // 2/10 = 20%
    const result = buildTurnContext(vaultDir);
    expect(result).toContain('<kg-stale-advisory');
    expect(result).toContain('ACTION REQUIRED');
    expect(result).toContain('ratio="20%"');
  });

  it('does NOT append <kg-stale-advisory> when stale ratio <=10%', () => {
    writeIndex(Array.from({ length: 20 }, (_, i) => ({ layer: 1 })));
    writeStaleNodes(['/a.md']); // 1/20 = 5%
    const result = buildTurnContext(vaultDir);
    expect(result).not.toContain('<kg-stale-advisory');
  });

  it('includes vault attribute from companion identity', () => {
    writeCompanion('Ari');
    const result = buildTurnContext(vaultDir);
    expect(result).toContain('vault="Ari"');
  });

  it('all output text is in English (no Korean characters)', () => {
    writeIndex([{ layer: 1 }, { layer: 3 }]);
    writeStaleNodes(['/a.md']);
    const result = buildTurnContext(vaultDir);
    // Check no Korean characters (Hangul range: U+AC00-U+D7A3)
    expect(result).not.toMatch(/[\uAC00-\uD7A3]/);
  });

  it('includes <companion-identity> tag with name and role', () => {
    writeCompanion({
      name: 'Ari',
      role: 'knowledge curator',
    });
    const result = buildTurnContext(vaultDir);
    expect(result).toContain('<companion-identity>');
    expect(result).toContain('You are Ari, a knowledge curator.');
    expect(result).toContain('</companion-identity>');
  });

  it('includes personality attributes and traits in identity tag', () => {
    writeCompanion({
      name: 'Ari',
      personality: {
        tone: 'warm',
        approach: 'socratic',
        traits: ['curious', 'empathetic'],
      },
    });
    const result = buildTurnContext(vaultDir);
    expect(result).toContain(
      '<personality tone="warm" approach="socratic">curious,empathetic</personality>',
    );
  });

  it('includes principles in identity tag', () => {
    writeCompanion({
      name: 'Ari',
      principles: ['clarity first', 'ask before assuming'],
    });
    const result = buildTurnContext(vaultDir);
    expect(result).toContain(
      '<principles>clarity first | ask before assuming</principles>',
    );
  });

  it('places <companion-identity> before <kg-core>', () => {
    writeCompanion({ name: 'Ari', role: 'guide' });
    writeIndex([{ layer: 1 }]);
    const result = buildTurnContext(vaultDir);
    const identityIdx = result.indexOf('<companion-identity');
    const kgCoreIdx = result.indexOf('<kg-core');
    expect(identityIdx).toBeGreaterThanOrEqual(0);
    expect(identityIdx).toBeLessThan(kgCoreIdx);
  });

  it('omits <companion-identity> when no identity file exists', () => {
    const result = buildTurnContext(vaultDir);
    expect(result).not.toContain('<companion-identity');
  });

  it('renders minimal identity tag with name only (no optional fields)', () => {
    writeCompanion('Ari');
    const result = buildTurnContext(vaultDir);
    expect(result).toContain('<companion-identity>');
    expect(result).toContain('You are Ari.');
    expect(result).not.toContain('<personality');
    expect(result).not.toContain('<principles');
    expect(result).toContain('</companion-identity>');
  });
});

describe('readCompanionIdentity', () => {
  it('returns null when file is missing', () => {
    expect(readCompanionIdentity('/nonexistent')).toBeNull();
  });

  it('returns full identity with optional fields', () => {
    writeCompanion({
      name: 'Ari',
      role: 'curator',
      personality: { tone: 'warm', traits: ['kind'] },
      principles: ['be clear'],
    });
    const identity = readCompanionIdentity(vaultDir);
    expect(identity).not.toBeNull();
    expect(identity!.name).toBe('Ari');
    expect(identity!.role).toBe('curator');
    expect(identity!.personality?.tone).toBe('warm');
    expect(identity!.principles).toEqual(['be clear']);
  });

  it('returns null for invalid data (missing required fields)', () => {
    writeFileSync(
      join(vaultDir, '.maencof-meta', 'companion-identity.json'),
      JSON.stringify({ schema_version: 1 }),
      'utf-8',
    );
    expect(readCompanionIdentity(vaultDir)).toBeNull();
  });
});
