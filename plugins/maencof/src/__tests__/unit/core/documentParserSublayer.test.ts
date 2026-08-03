import { describe, expect, it } from 'vitest';

import {
  type ParsedDocument,
  buildKnowledgeNode,
  inferSubLayerFromPath,
  parseDocument,
} from '../../../core/documentParser/index.js';

function toYaml(obj: Record<string, unknown>, indent = 0): string {
  const pad = '  '.repeat(indent);
  return Object.entries(obj)
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        if (v.length === 0) return `${pad}${k}: []`;
        if (typeof v[0] === 'object')
          return `${pad}${k}:\n${v.map((i) => `${pad}  - ${JSON.stringify(i)}`).join('\n')}`;

        return `${pad}${k}:\n${v.map((i) => `${pad}  - ${i}`).join('\n')}`;
      }
      if (v !== null && typeof v === 'object')
        return `${pad}${k}:\n${toYaml(v as Record<string, unknown>, indent + 1)}`;

      return `${pad}${k}: ${v}`;
    })
    .join('\n');
}

function makeMd(fm: Record<string, unknown>): string {
  return `---\n${toYaml(fm)}\n---\n# Test`;
}

const baseFm = {
  created: '2026-01-01',
  updated: '2026-03-04',
  tags: ['test'],
  layer: 3,
};

describe('inferSubLayerFromPath', () => {
  it.each([
    ['03_External/relational/alice.md', 'relational'],
    ['03_External/structural/company-x.md', 'structural'],
    ['03_External/topical/react-hooks.md', 'topical'],
  ] as const)('%s → %s', (path, expected) => {
    expect(inferSubLayerFromPath(path)).toBe(expected);
  });

  it.each([
    '03_External/react-hooks.md',
    '01_Core/identity.md',
    '05_Context/meta.md',
    '05_Context/buffer/inbox.md',
    'random/file.md',
  ])('%s → undefined', (path) => {
    expect(inferSubLayerFromPath(path)).toBeUndefined();
  });
});

describe('buildKnowledgeNode sub-layer propagation', () => {
  it('frontmatter sub_layer를 노드에 전파한다', () => {
    const doc = parseDocument(
      '03_External/alice.md',
      makeMd({ ...baseFm, sub_layer: 'relational' }),
      1000,
    );
    const result = buildKnowledgeNode(doc);
    expect(result.success).toBe(true);
    expect(result.node?.subLayer).toBe('relational');
  });

  it('sub_layer 없으면 경로에서 추론한다', () => {
    const doc = parseDocument(
      '03_External/relational/alice.md',
      makeMd(baseFm),
      1000,
    );
    const result = buildKnowledgeNode(doc);
    expect(result.success).toBe(true);
    expect(result.node?.subLayer).toBe('relational');
  });

  it('sub_layer 없고 경로 패턴 없으면 undefined', () => {
    const doc = parseDocument(
      '03_External/react-hooks.md',
      makeMd(baseFm),
      1000,
    );
    const result = buildKnowledgeNode(doc);
    expect(result.success).toBe(true);
    expect(result.node?.subLayer).toBeUndefined();
  });

  it('허브 속성을 전파한다', () => {
    const doc = parseDocument(
      '03_External/structural/moc.md',
      makeMd({
        ...baseFm,
        sub_layer: 'structural',
        hub: true,
        hub_kind: 'project_moc',
        purpose: '제어이론 학습 경로 통합',
      }),
      1000,
    );
    const result = buildKnowledgeNode(doc);
    expect(result.success).toBe(true);
    expect(result.node?.hub).toBe(true);
    expect(result.node?.hubKind).toBe('project_moc');
    expect(result.node?.purpose).toBe('제어이론 학습 경로 통합');
  });

  it('person을 전파한다', () => {
    const doc: ParsedDocument = {
      relativePath: '03_External/relational/alice.md',
      frontmatter: {
        success: true,
        data: {
          ...baseFm,
          sub_layer: 'relational' as const,
          person: {
            name: 'Alice',
            relationship_type: 'friend',
            intimacy_level: 4,
          },
        },
        raw: '',
      },
      body: '# Test',
      links: [],
      mtime: 1000,
    };
    const result = buildKnowledgeNode(doc);
    expect(result.success).toBe(true);
    expect(result.node?.person).toBeDefined();
    expect(result.node?.person?.name).toBe('Alice');
  });

  it('domain을 전파한다', () => {
    const doc = parseDocument(
      '03_External/engineering.md',
      makeMd({ ...baseFm, domain: 'engineering' }),
      1000,
    );
    const result = buildKnowledgeNode(doc);
    expect(result.success).toBe(true);
    expect(result.node?.domain).toBe('engineering');
  });

  it('person/domain 없는 문서는 undefined', () => {
    const doc = parseDocument('03_External/plain.md', makeMd(baseFm), 1000);
    const result = buildKnowledgeNode(doc);
    expect(result.success).toBe(true);
    expect(result.node?.person).toBeUndefined();
    expect(result.node?.domain).toBeUndefined();
  });
});
