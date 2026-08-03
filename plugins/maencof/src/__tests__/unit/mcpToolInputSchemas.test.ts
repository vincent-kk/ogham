/**
 * @file mcpToolInputSchemas.test.ts
 * @description 등록된 CRUD 도구의 입력 스키마 표면 회귀 방어.
 *
 * 핸들러가 처리하는 필드가 inputSchema 에 없으면 Zod 가 조용히 탈락시켜
 * 호출자는 그 기능에 영영 도달하지 못한다. 에러 메시지가 안내하는 복구 수단이
 * 실행 불가능해지는 형태로 드러난다. 여기서는 핸들러 동작이 아니라
 * **도구 표면에 필드가 도달했는지** 만 확인한다.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';
import type { ZodObject, ZodRawShape } from 'zod';

import { McpToolName } from '../../constants/mcpToolNames.js';
import { registerCrudTools } from '../../mcp/server/registrations/operations/crud.js';

/** 등록 시점의 meta 만 수집하는 stub — 핸들러 콜백은 호출하지 않는다. */
function collectRegisteredSchemas(): Map<string, ZodObject<ZodRawShape>> {
  const schemas = new Map<string, ZodObject<ZodRawShape>>();
  const stub = {
    registerTool(
      name: string,
      meta: { inputSchema: ZodObject<ZodRawShape> },
    ): unknown {
      schemas.set(name, meta.inputSchema);
      return {};
    },
  } as unknown as McpServer;

  registerCrudTools(stub);
  return schemas;
}

describe('CRUD 도구 입력 스키마 표면', () => {
  it('update 는 frontmatter.unset 을 받는다 — 손상 필드 복구의 유일한 경로', () => {
    const schema = collectRegisteredSchemas().get(McpToolName.UPDATE);
    expect(schema).toBeDefined();

    const parsed = schema!.parse({
      path: '05_Context/note.md',
      frontmatter: { unset: ['connected_layers'] },
    }) as { frontmatter?: { unset?: string[] } };

    expect(parsed.frontmatter?.unset).toEqual(['connected_layers']);
  });

  it('create 는 허브 속성과 L5 필드를 받는다', () => {
    const schema = collectRegisteredSchemas().get(McpToolName.CREATE);
    expect(schema).toBeDefined();

    const hub = schema!.parse({
      layer: 3,
      tags: ['t'],
      content: 'body',
      hub: true,
      hub_kind: 'study_hub',
      purpose: '통합',
    });
    expect(hub).toMatchObject({
      hub: true,
      hub_kind: 'study_hub',
      purpose: '통합',
    });

    const buffer = schema!.parse({
      layer: 5,
      tags: ['t'],
      content: 'body',
      buffer_type: 'snippet',
      promotion_target: 'topical',
      source_context: '웹 스크랩',
    });
    expect(buffer).toMatchObject({
      buffer_type: 'snippet',
      promotion_target: 'topical',
      source_context: '웹 스크랩',
    });
  });

  it('update 는 기존 문서를 허브로 승격하는 필드를 받는다', () => {
    const schema = collectRegisteredSchemas().get(McpToolName.UPDATE);
    const parsed = schema!.parse({
      path: '03_External/structural/moc.md',
      frontmatter: { hub: true, hub_kind: 'project_moc', purpose: '통합' },
    }) as { frontmatter?: Record<string, unknown> };

    expect(parsed.frontmatter).toMatchObject({
      hub: true,
      hub_kind: 'project_moc',
      purpose: '통합',
    });
  });

  it('폐지된 서브레이어 값은 스키마에서 거부된다', () => {
    const schema = collectRegisteredSchemas().get(McpToolName.CREATE);
    expect(() =>
      schema!.parse({
        layer: 5,
        tags: ['t'],
        content: 'body',
        sub_layer: 'buffer',
      }),
    ).toThrow();
  });
});
