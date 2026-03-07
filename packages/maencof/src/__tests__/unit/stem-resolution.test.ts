/**
 * @file stem-resolution.test.ts
 * @description Stem-only wikilink resolution 테스트
 */
import { describe, expect, it } from 'vitest';

import {
  buildStemIndex,
  resolveAndAttachLinks,
} from '../../mcp/tools/kg-build.js';
import { Layer, toNodeId } from '../../types/common.js';
import type { NodeId } from '../../types/common.js';
import type { KnowledgeNode } from '../../types/graph.js';

function makeNode(
  path: string,
  layer: Layer = Layer.L2_DERIVED,
): KnowledgeNode {
  return {
    id: toNodeId(path),
    path,
    title: path,
    layer,
    tags: ['test'],
    created: '2026-01-01',
    updated: '2026-01-01',
    mtime: 0,
    accessed_count: 0,
  };
}

function makeNodes(...paths: string[]): Map<NodeId, KnowledgeNode> {
  const map = new Map<NodeId, KnowledgeNode>();
  for (const path of paths) {
    const node = makeNode(path);
    map.set(node.id, node);
  }
  return map;
}

describe('buildStemIndex', () => {
  it('파일명 → 풀 경로 역인덱스를 구축한다', () => {
    const nodes = makeNodes(
      '01_Core/values.md',
      '02_Derived/notes/my-note.md',
    );
    const index = buildStemIndex(nodes);
    expect(index.get('values.md')).toBe('01_Core/values.md');
    expect(index.get('my-note.md')).toBe('02_Derived/notes/my-note.md');
  });

  it('동일 파일명이 여러 경로에 있으면 정렬 순서상 첫 번째를 사용한다', () => {
    const nodes = makeNodes(
      '02_Derived/readme.md',
      '01_Core/readme.md',
      '03_External/readme.md',
    );
    const index = buildStemIndex(nodes);
    // 정렬 순서: 01_Core < 02_Derived < 03_External
    expect(index.get('readme.md')).toBe('01_Core/readme.md');
  });
});

describe('resolveAndAttachLinks — stem-only fallback', () => {
  it('stem-only 위키링크를 풀 경로로 해석한다', () => {
    const nodes = makeNodes(
      '01_Core/source.md',
      '02_Derived/subfolder/note-name.md',
    );
    const links = [{ from: '01_Core/source.md', to: 'note-name.md' }];
    resolveAndAttachLinks(nodes, links);

    const source = nodes.get(toNodeId('01_Core/source.md'));
    expect(source?.outboundLinks).toEqual(['02_Derived/subfolder/note-name.md']);
  });

  it('vault-root-relative 경로가 직접 매칭되면 stem 폴백을 사용하지 않는다', () => {
    const nodes = makeNodes(
      '01_Core/source.md',
      '02_Derived/exact-path.md',
    );
    const links = [{ from: '01_Core/source.md', to: '02_Derived/exact-path.md' }];
    resolveAndAttachLinks(nodes, links);

    const source = nodes.get(toNodeId('01_Core/source.md'));
    expect(source?.outboundLinks).toEqual(['02_Derived/exact-path.md']);
  });

  it('상대 경로 (./) 는 정상적으로 해석한다 (stem 폴백 없음)', () => {
    const nodes = makeNodes(
      '01_Core/source.md',
      '01_Core/sibling.md',
    );
    const links = [{ from: '01_Core/source.md', to: './sibling.md' }];
    resolveAndAttachLinks(nodes, links);

    const source = nodes.get(toNodeId('01_Core/source.md'));
    expect(source?.outboundLinks).toEqual(['01_Core/sibling.md']);
  });

  it('상대 경로 (../) 는 정상적으로 해석한다', () => {
    const nodes = makeNodes(
      '02_Derived/sub/source.md',
      '02_Derived/target.md',
    );
    const links = [{ from: '02_Derived/sub/source.md', to: '../target.md' }];
    resolveAndAttachLinks(nodes, links);

    const source = nodes.get(toNodeId('02_Derived/sub/source.md'));
    expect(source?.outboundLinks).toEqual(['02_Derived/target.md']);
  });

  it('해석할 수 없는 stem은 원래 href를 유지한다', () => {
    const nodes = makeNodes('01_Core/source.md');
    const links = [{ from: '01_Core/source.md', to: 'nonexistent.md' }];
    resolveAndAttachLinks(nodes, links);

    const source = nodes.get(toNodeId('01_Core/source.md'));
    expect(source?.outboundLinks).toEqual(['nonexistent.md']);
  });

  it('여러 링크를 동시에 해석한다 (직접 매칭 + stem 폴백 혼합)', () => {
    const nodes = makeNodes(
      '01_Core/source.md',
      '02_Derived/direct.md',
      '03_External/topical/stem-only.md',
    );
    const links = [
      { from: '01_Core/source.md', to: '02_Derived/direct.md' },
      { from: '01_Core/source.md', to: 'stem-only.md' },
    ];
    resolveAndAttachLinks(nodes, links);

    const source = nodes.get(toNodeId('01_Core/source.md'));
    expect(source?.outboundLinks).toEqual([
      '02_Derived/direct.md',
      '03_External/topical/stem-only.md',
    ]);
  });
});
