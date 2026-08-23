// filid:contract AC-sublayer-from-maencof
/**
 * @file subLayerField.spec.ts
 * @description `search`·`context` 의 `sub_layer` 허용값이 maencof 레이어 모델을 따르는지 고정한다.
 *
 * 폐기된 값을 스키마가 계속 받아도 런타임은 조용하다 — maencof 핸들러는 노드의
 * `subLayer` 와 문자열 비교만 하므로 아무것도 맞지 않아 에러 없이 빈 결과가 된다.
 * 그래서 거절 여부를 핸들러가 아니라 스키마에서 확인한다.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ZodObject, ZodRawShape } from "zod";

import { McpToolName } from "../../../constants/mcpToolNames.js";

type InputSchema = ZodObject<ZodRawShape>;

const schemas = new Map<string, InputSchema>();

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: vi.fn().mockImplementation(function () {
    return {
      registerTool: vi.fn(
        (name: string, config: { inputSchema: InputSchema }) => {
          schemas.set(name, config.inputSchema);
        },
      ),
      connect: vi.fn(),
    };
  }),
}));

/** 등록 시점의 inputSchema 만 모은다 — 툴 콜백은 호출하지 않는다. */
async function collectSchemas(): Promise<Map<string, InputSchema>> {
  const { createLensServer } = await import("../index.js");
  createLensServer(null);
  return schemas;
}

/** v3 가 인정하는 서브레이어 — L3 방향성 3종. */
const L3_SUB_LAYERS = ["relational", "structural", "topical"];
/** v2 가 L5 서브레이어로 쓰던 값. v3 의 L5 는 서브레이어 없는 평면이다. */
const RETIRED_L5_SUB_LAYERS = ["buffer", "boundary"];

describe("sub_layer 입력 스키마", () => {
  let collected: Map<string, InputSchema>;

  beforeAll(async () => {
    collected = await collectSchemas();
  });

  it("search 는 L3 서브레이어를 받고 폐기된 L5 값을 거절한다", () => {
    const schema = collected.get(McpToolName.SEARCH);
    expect(schema).toBeDefined();

    for (const value of L3_SUB_LAYERS)
      expect(schema!.parse({ seed: ["s"], sub_layer: value })).toMatchObject({
        sub_layer: value,
      });

    for (const value of RETIRED_L5_SUB_LAYERS)
      expect(() => schema!.parse({ seed: ["s"], sub_layer: value })).toThrow();
  });

  it("context 는 L3 서브레이어를 받고 폐기된 L5 값을 거절한다", () => {
    const schema = collected.get(McpToolName.CONTEXT);
    expect(schema).toBeDefined();

    for (const value of L3_SUB_LAYERS)
      expect(schema!.parse({ query: "q", sub_layer: value })).toMatchObject({
        sub_layer: value,
      });

    for (const value of RETIRED_L5_SUB_LAYERS)
      expect(() => schema!.parse({ query: "q", sub_layer: value })).toThrow();
  });

  it("두 툴이 같은 스키마 인스턴스를 공유해 허용값이 갈라질 수 없다", () => {
    const search = collected.get(McpToolName.SEARCH);
    const context = collected.get(McpToolName.CONTEXT);

    expect(search!.shape.sub_layer).toBe(context!.shape.sub_layer);
  });
});
