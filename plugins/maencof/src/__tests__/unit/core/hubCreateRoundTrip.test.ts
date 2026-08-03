/**
 * @file hubCreateRoundTrip.test.ts
 * @description create → 디스크 → parseDocument 왕복.
 *
 * 이 결함의 원형은 객체 단계 검증만 있고 왕복 검증이 없어서, 쓰기는 성공하고
 * 되읽기부터 스키마 검증이 막히는 문서가 생기는 것이었다. 객체 단계 게이트는
 * 그 지점을 지키지 못하므로, 허브·L5 문서는 실제 파일을 되읽어 확인한다.
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../../core/documentParser/index.js';
import { handleMaencofCreate } from '../../../mcp/tools/maencofCreate/maencofCreate.js';
import { handleMaencofUpdate } from '../../../mcp/tools/maencofUpdate/maencofUpdate.js';
import { Layer } from '../../../types/common.js';

describe('create → parseDocument 왕복', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await mkdtemp(join(tmpdir(), 'maencof-hub-roundtrip-'));
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  /** 생성된 문서를 디스크에서 되읽어 노드로 만든다. */
  async function readBackNode(relativePath: string) {
    const content = await readFile(join(vault, relativePath), 'utf-8');
    return buildKnowledgeNode(parseDocument(relativePath, content, 1000));
  }

  it('허브 문서가 되읽혀 hub 속성을 유지한다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: Layer.L3_EXTERNAL,
      sub_layer: 'structural',
      tags: ['control-theory', 'study'],
      content: 'Hub body.',
      title: '제어이론 학습 허브',
      hub: true,
      hub_kind: 'study_hub',
      purpose: '제어이론 학습 경로 통합',
    });

    expect(result.success).toBe(true);
    expect(result.path).toMatch(/^03_External\/structural\//);

    const node = await readBackNode(result.path);
    expect(node.success).toBe(true);
    expect(node.node?.hub).toBe(true);
    expect(node.node?.hubKind).toBe('study_hub');
    expect(node.node?.purpose).toBe('제어이론 학습 경로 통합');
  });

  it('L5 임시 문서가 평면 경로에 쓰이고 되읽힌다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: Layer.L5_CONTEXT,
      tags: ['quantum'],
      content: 'Fragment.',
      title: '양자 힌트',
      buffer_type: 'snippet',
      promotion_target: 'topical',
      source_context: '대화 중 멘션',
    });

    expect(result.success).toBe(true);
    expect(result.path).toMatch(/^05_Context\/[^/]+\.md$/);

    const node = await readBackNode(result.path);
    expect(node.success).toBe(true);
    expect(node.node?.layer).toBe(Layer.L5_CONTEXT);
    expect(node.node?.subLayer).toBeUndefined();
  });

  it('purpose 없는 허브는 쓰기 전에 거부된다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: Layer.L3_EXTERNAL,
      tags: ['x'],
      content: 'Body.',
      title: '미완 허브',
      hub: true,
      hub_kind: 'synthesis',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('hub requires purpose');
  });

  it('L5 문서는 허브가 될 수 없다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: Layer.L5_CONTEXT,
      tags: ['x'],
      content: 'Body.',
      title: '임시 허브 시도',
      hub: true,
      purpose: '통합 시도',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Layer 5 documents cannot be hubs');
  });

  it('update 로 승격한 허브가 디스크에 기록되고 되읽힌다', async () => {
    const created = await handleMaencofCreate(vault, {
      layer: Layer.L3_EXTERNAL,
      sub_layer: 'structural',
      tags: ['ogham'],
      content: 'Body.',
      title: 'ogham 생태계',
    });
    expect(created.success).toBe(true);

    const updated = await handleMaencofUpdate(vault, {
      path: created.path,
      frontmatter: {
        hub: true,
        hub_kind: 'project_moc',
        purpose: '플러그인 생태계 통합',
      },
    });
    expect(updated.success).toBe(true);

    const node = await readBackNode(created.path);
    expect(node.node?.hub).toBe(true);
    expect(node.node?.hubKind).toBe('project_moc');
    expect(node.node?.purpose).toBe('플러그인 생태계 통합');
  });

  it('숫자꼴 태그가 왕복 후에도 문자열로 남는다', async () => {
    const result = await handleMaencofCreate(vault, {
      layer: Layer.L4_ACTION,
      tags: ['2026', 'retro'],
      content: 'Body.',
      title: '회고',
    });

    expect(result.success).toBe(true);
    const node = await readBackNode(result.path);
    expect(node.success).toBe(true);
    expect(node.node?.tags).toEqual(['2026', 'retro']);
  });
});
