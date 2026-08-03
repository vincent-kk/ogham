/**
 * @file architectureMigratorL5.test.ts
 * @description v2 → v3 마이그레이션의 L5 경로 — 평면화와 허브 이관.
 *
 * 이 경로가 만드는 문서는 v3 스키마를 통과해야 한다. 마이그레이션이 옮기기만 하고
 * frontmatter 를 v3 계약에 맞추지 못하면, 그 vault 는 이관 직후부터 read·update 가
 * 막힌다 — v2 의 boundary_create 가 만들던 것과 같은 형태의 고장이다.
 * 그래서 이동 결과를 파일에서 되읽어 `validateFrontmatter` 에 통과시킨다.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  executeMigration,
  planMigration,
} from '../../core/architectureMigrator/index.js';
import { parseYamlFrontmatter } from '../../core/yamlParser/index.js';
import { validateFrontmatter } from '../../types/frontmatter.js';

const BUFFER_DOC = `---
created: 2026-05-01
updated: 2026-05-01
tags: [fragment]
layer: 5
sub_layer: buffer
---
# Buffer Fragment

Awaiting triage.
`;

const BOUNDARY_DOC = `---
created: 2026-04-01
updated: 2026-04-01
tags: [ogham, plugins]
layer: 5
sub_layer: boundary
boundary_type: project_moc
connected_layers: [2, 3, 4]
title: ogham 플러그인 생태계
---
# ogham 플러그인 생태계

Cross-layer MOC.
`;

/** 마이그레이션 대상 파일의 frontmatter 를 파싱해 돌려준다. */
function readFrontmatter(path: string): Record<string, unknown> {
  const content = readFileSync(path, 'utf-8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  return parseYamlFrontmatter(match?.[1] ?? '');
}

describe('architecture migration — v2 L5 → v3', () => {
  let vault: string;

  beforeEach(() => {
    vault = join(
      tmpdir(),
      `maencof-l5-migration-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    for (const dir of [
      '.maencof-meta',
      '03_External',
      '05_Context/buffer',
      '05_Context/boundary',
    ])
      mkdirSync(join(vault, dir), { recursive: true });

    writeFileSync(
      join(vault, '.maencof-meta', 'version.json'),
      JSON.stringify({ architecture_version: '2.0.0' }),
    );
    writeFileSync(join(vault, '05_Context/buffer/fragment.md'), BUFFER_DOC);
    writeFileSync(
      join(vault, '05_Context/boundary/ogham-moc.md'),
      BOUNDARY_DOC,
    );
  });

  afterEach(() => rmSync(vault, { recursive: true, force: true }));

  it('buffer 문서를 05_Context/ 평면으로 올리고 sub_layer 를 제거한다', () => {
    executeMigration(vault, planMigration(vault));

    const moved = join(vault, '05_Context/fragment.md');
    expect(existsSync(moved)).toBe(true);
    expect(existsSync(join(vault, '05_Context/buffer/fragment.md'))).toBe(
      false,
    );

    const fm = readFrontmatter(moved);
    expect(fm.layer).toBe(5);
    expect(fm.sub_layer).toBeUndefined();
  });

  it('boundary 문서를 L3-structural 허브로 이관한다', () => {
    executeMigration(vault, planMigration(vault));

    const moved = join(vault, '03_External/structural/ogham-moc.md');
    expect(existsSync(moved)).toBe(true);
    expect(existsSync(join(vault, '05_Context/boundary/ogham-moc.md'))).toBe(
      false,
    );

    const fm = readFrontmatter(moved);
    expect(fm.layer).toBe(3);
    expect(fm.sub_layer).toBe('structural');
    expect(fm.hub).toBe(true);
    expect(fm.hub_kind).toBe('project_moc');
    expect(fm.purpose).toBe('ogham 플러그인 생태계');
    expect(fm.boundary_type).toBeUndefined();
    expect(fm.connected_layers).toBeUndefined();
  });

  it('이관된 문서가 v3 스키마를 통과한다 — 이관 직후 read 가 막히면 안 된다', () => {
    executeMigration(vault, planMigration(vault));

    for (const path of [
      '05_Context/fragment.md',
      '03_External/structural/ogham-moc.md',
    ]) {
      const result = validateFrontmatter(readFrontmatter(join(vault, path)));
      expect(
        result.ok,
        `${path}: ${result.ok ? '' : result.errors.join('; ')}`,
      ).toBe(true);
    }
  });

  it('빈 L5 서브디렉토리를 정리하고 버전을 올린다', () => {
    executeMigration(vault, planMigration(vault));

    expect(existsSync(join(vault, '05_Context/buffer'))).toBe(false);
    expect(existsSync(join(vault, '05_Context/boundary'))).toBe(false);

    const version = JSON.parse(
      readFileSync(join(vault, '.maencof-meta', 'version.json'), 'utf-8'),
    ) as { architecture_version: string };
    expect(version.architecture_version).toBe('3.0.0');
  });
});
