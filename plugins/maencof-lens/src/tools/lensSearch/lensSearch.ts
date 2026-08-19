import { handleKgSearch, toNodeId } from "@ogham/maencof";
import type { KnowledgeGraph, SubLayer } from "@ogham/maencof";

import { computeEffectiveLayers } from "../../filter/layerGuard/index.js";

export interface LensSearchInput {
  vault?: string;
  /** 시드 키워드 — `cluster` 와 상호 배타 (판정은 maencof 소유) */
  seed?: string[];
  /** 접힌 클러스터 열기 — maencof 열거 모드로 통과. 결과는 볼트 상한으로 후필터된다 */
  cluster?: string;
  max_results?: number;
  decay?: number;
  threshold?: number;
  max_hops?: number;
  layer_filter?: number[];
  sub_layer?: SubLayer;
  include_trace?: boolean;
  include_content?: boolean;
}

export async function handleLensSearch(
  graph: KnowledgeGraph | null,
  input: LensSearchInput,
  vaultPath: string,
  vaultLayers: number[],
): Promise<Record<string, unknown>> {
  const effectiveLayers = computeEffectiveLayers(
    vaultLayers,
    input.layer_filter,
  );

  if (graph === null)
    return {
      error: "Vault index not available. Run kg_build in a maencof session.",
    };

  const result = await handleKgSearch(
    graph,
    {
      seed: input.seed,
      cluster: input.cluster,
      max_results: input.max_results,
      decay: input.decay,
      threshold: input.threshold,
      max_hops: input.max_hops,
      layer_filter: effectiveLayers,
      sub_layer: input.sub_layer,
      include_trace: input.include_trace,
      include_content: input.include_content,
    },
    vaultPath,
  );

  // graph-null 은 위에서 치환했으므로 여기 오류는 입력 검증(상호 배타 등) — 문구 그대로 전파
  if ("error" in result) return result as unknown as Record<string, unknown>;

  // maencof 열거 모드는 layer_filter 를 적용하지 않는다 — 볼트 상한(기본 L2–L5) 밖
  // 멤버가 lens 로 새지 않도록 어댑터가 후필터한다. clusterSize 는 전역 총원 그대로.
  if (input.cluster) {
    const allowed = new Set<number>(effectiveLayers);
    const results = result.results.filter((item) => {
      const layer = graph.nodes.get(toNodeId(item.path))?.layer;
      return layer !== undefined && allowed.has(layer as number);
    });
    return { ...result, results } as unknown as Record<string, unknown>;
  }

  return result as unknown as Record<string, unknown>;
}
