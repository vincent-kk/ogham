/**
 * 그래프 구축 파이프라인 이식 — buildGraph(LINK+tree+domain) → calculateWeights
 * (Wu-Palmer/SCS 근사 + PageRank) → hydrate(인접/엣지맵/역인덱스).
 *
 * plugins/maencof graphBuilder/weightCalculator HEAD(2026-07-08) 로직의 충실 이식.
 * 벤치마크 픽스처가 사용하지 않는 builder(RELATIONSHIP/CROSS_LAYER)는 제외 —
 * 픽스처에 person/connectedLayers 노드가 없어 원본에서도 빈 결과다(INDEX.md 참조).
 */
import {
  EDGE_TYPE_MULTIPLIER,
  WORD_BOUNDARY_SPLIT_REGEX,
} from "./constants.mjs";

function getDirectory(filePath) {
  const lastSlash = filePath.lastIndexOf("/");
  return lastSlash >= 0 ? filePath.slice(0, lastSlash) : "";
}

function buildTreeEdges(nodes, nodeMap) {
  const edges = [];
  for (const node of nodes) {
    const dir = getDirectory(node.path);
    const parentDir = getDirectory(dir);
    if (parentDir === dir) continue;
    const parentIndexId = `${parentDir}/index.md`;
    if (!nodeMap.has(parentIndexId)) continue;
    edges.push({
      from: parentIndexId,
      to: node.id,
      type: "PARENT_OF",
      weight: 1.0,
    });
    edges.push({
      from: node.id,
      to: parentIndexId,
      type: "CHILD_OF",
      weight: 1.0,
    });
  }

  const dirMap = new Map();
  for (const node of nodes) {
    const dir = getDirectory(node.path);
    if (!dirMap.has(dir)) dirMap.set(dir, []);
    dirMap.get(dir).push(node.id);
  }
  for (const [, siblings] of dirMap) {
    if (siblings.length < 2) continue;
    for (let i = 0; i < siblings.length; i++)
      for (let j = i + 1; j < siblings.length; j++) {
        edges.push({
          from: siblings[i],
          to: siblings[j],
          type: "SIBLING",
          weight: 1.0,
        });
        edges.push({
          from: siblings[j],
          to: siblings[i],
          type: "SIBLING",
          weight: 1.0,
        });
      }
  }
  return edges;
}

function buildDomainEdges(nodes) {
  const edges = [];
  const domainMap = new Map();
  for (const node of nodes)
    if (node.domain) {
      if (!domainMap.has(node.domain)) domainMap.set(node.domain, []);
      domainMap.get(node.domain).push(node);
    }

  for (const [, group] of domainMap) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++) {
        edges.push({
          from: group[i].id,
          to: group[j].id,
          type: "DOMAIN",
          weight: 0.3,
        });
        edges.push({
          from: group[j].id,
          to: group[i].id,
          type: "DOMAIN",
          weight: 0.3,
        });
      }
  }
  return edges;
}

export function buildGraph(nodes) {
  const nodeMap = new Map();
  for (const node of nodes) nodeMap.set(node.id, node);

  const edges = [];
  for (const node of nodes)
    if (node.outboundLinks)
      for (const target of node.outboundLinks)
        if (nodeMap.has(target))
          edges.push({ from: node.id, to: target, type: "LINK", weight: 1.0 });

  for (const e of buildTreeEdges(nodes, nodeMap)) edges.push(e);
  for (const e of buildDomainEdges(nodes)) edges.push(e);

  return {
    nodes: nodeMap,
    edges,
    builtAt: "1970-01-01T00:00:00.000Z",
    nodeCount: nodeMap.size,
    edgeCount: edges.length,
  };
}

function getPathDepth(filePath) {
  return filePath.split("/").length;
}

function getLCSDepth(pathA, pathB) {
  const partsA = pathA.split("/");
  const partsB = pathB.split("/");
  let lcs = 0;
  const minLen = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < minLen; i++)
    if (partsA[i] === partsB[i]) lcs++;
    else break;

  return lcs;
}

function computeWuPalmerWeight(a, b) {
  const depthA = getPathDepth(a.path);
  const depthB = getPathDepth(b.path);
  const lcsDepth = getLCSDepth(a.path, b.path);
  const denominator = depthA + depthB;
  if (denominator === 0) return 1.0;
  return Math.min(1.0, (2 * lcsDepth) / denominator);
}

function computeSCSWeight(a, b) {
  const partsA = a.path.split("/");
  const partsB = b.path.split("/");
  let commonLen = 0;
  const minLen = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < minLen; i++)
    if (partsA[i] === partsB[i]) commonLen++;
    else break;

  const maxLen = Math.max(partsA.length, partsB.length);
  if (maxLen === 0) return 1.0;
  return Math.min(1.0, commonLen / maxLen);
}

function computeRelationshipWeight(a, b) {
  const levelA = a.person?.intimacy_level ?? 3;
  const levelB = b.person?.intimacy_level ?? 3;
  const avg = (levelA + levelB) / 2;
  return Math.min(1.0, 0.2 + (avg - 1) * 0.2);
}

function computeEdgeWeight(edge, graph) {
  const fromNode = graph.nodes.get(edge.from);
  const toNode = graph.nodes.get(edge.to);
  if (!fromNode || !toNode) return 1.0;

  switch (edge.type) {
    case "LINK":
      return computeSCSWeight(fromNode, toNode);
    case "PARENT_OF":
    case "CHILD_OF":
    case "SIBLING":
      return computeWuPalmerWeight(fromNode, toNode);
    case "RELATIONSHIP":
      return computeRelationshipWeight(fromNode, toNode);
    case "CROSS_LAYER":
      return 1.0;
    case "DOMAIN":
      return 0.3;
    default:
      return 1.0;
  }
}

function isPageRankEdge(edgeType) {
  return (
    edgeType === "LINK" ||
    edgeType === "PARENT_OF" ||
    edgeType === "RELATIONSHIP"
  );
}

export function computePageRank(
  graph,
  dampingFactor = 0.85,
  maxIterations = 100,
  tolerance = 1e-6,
) {
  const nodeIds = Array.from(graph.nodes.keys());
  const n = nodeIds.length;
  if (n === 0) return new Map();

  const ranks = new Map();
  const outDegree = new Map();
  const inbound = new Map();
  for (const id of nodeIds) {
    ranks.set(id, 1.0 / n);
    outDegree.set(id, 0);
    inbound.set(id, []);
  }
  for (const edge of graph.edges) {
    if (!isPageRankEdge(edge.type)) continue;
    outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
    inbound.get(edge.to)?.push({ from: edge.from, weight: edge.weight });
  }
  const danglingNodes = nodeIds.filter((id) => (outDegree.get(id) ?? 0) === 0);

  for (let iter = 0; iter < maxIterations; iter++) {
    let danglingSum = 0;
    for (const id of danglingNodes) danglingSum += ranks.get(id) ?? 0;

    const newRanks = new Map();
    let maxDelta = 0;
    for (const id of nodeIds) {
      let rank = (1 - dampingFactor) / n + (dampingFactor * danglingSum) / n;
      for (const { from, weight } of inbound.get(id) ?? []) {
        const fromDegree = outDegree.get(from) ?? 1;
        rank += dampingFactor * (ranks.get(from) ?? 0) * (weight / fromDegree);
      }
      newRanks.set(id, rank);
      maxDelta = Math.max(maxDelta, Math.abs(rank - (ranks.get(id) ?? 0)));
    }
    for (const [id, r] of newRanks) ranks.set(id, r);
    if (maxDelta < tolerance) break;
  }
  return ranks;
}

export function calculateWeights(graph) {
  const edges = graph.edges.map((edge) => ({
    ...edge,
    weight: computeEdgeWeight(edge, graph),
  }));
  const pageranks = computePageRank(graph);
  return { edges, pageranks };
}

export function buildAdjacencyList(nodeMap, edges) {
  const adj = new Map();
  const seen = new Map();
  for (const id of nodeMap.keys()) {
    adj.set(id, []);
    seen.set(id, new Set());
  }
  for (const edge of edges) {
    const list = adj.get(edge.from);
    const seenSet = seen.get(edge.from);
    if (!list || !seenSet || seenSet.has(edge.to)) continue;
    seenSet.add(edge.to);
    list.push(edge.to);
  }
  return adj;
}

function buildEdgePairMaps(edges) {
  const edgeWeightMap = new Map();
  const edgeTypeMap = new Map();
  for (const edge of edges) {
    let typeInner = edgeTypeMap.get(edge.from);
    let weightInner = edgeWeightMap.get(edge.from);
    if (!typeInner || !weightInner) {
      typeInner = new Map();
      weightInner = new Map();
      edgeTypeMap.set(edge.from, typeInner);
      edgeWeightMap.set(edge.from, weightInner);
    }
    const existingType = typeInner.get(edge.to);
    if (
      existingType !== undefined &&
      EDGE_TYPE_MULTIPLIER[existingType] >= EDGE_TYPE_MULTIPLIER[edge.type]
    )
      continue;

    typeInner.set(edge.to, edge.type);
    weightInner.set(edge.to, edge.weight);
  }
  return { edgeWeightMap, edgeTypeMap };
}

export function tokenizeForInvertedIndex(node) {
  const terms = [];
  for (const word of node.title.split(WORD_BOUNDARY_SPLIT_REGEX)) {
    const lower = word.toLowerCase();
    if (lower.length > 0) terms.push(lower);
  }
  for (const tag of node.tags) {
    const lower = tag.toLowerCase();
    if (lower.length > 0) terms.push(lower);
  }
  if (node.mentioned_persons)
    for (const person of node.mentioned_persons) {
      const lower = person.toLowerCase();
      if (lower.length > 0) terms.push(lower);
    }

  return terms;
}

function buildInvertedIndex(nodeMap) {
  const index = new Map();
  for (const node of nodeMap.values())
    for (const term of tokenizeForInvertedIndex(node)) {
      let set = index.get(term);
      if (!set) {
        set = new Set();
        index.set(term, set);
      }
      set.add(node.id);
    }

  return index;
}

export function hydrateRuntimeMaps(graph) {
  const { edgeWeightMap, edgeTypeMap } = buildEdgePairMaps(graph.edges);
  graph.adjacencyList = buildAdjacencyList(graph.nodes, graph.edges);
  graph.edgeWeightMap = edgeWeightMap;
  graph.edgeTypeMap = edgeTypeMap;
  graph.invertedIndex = buildInvertedIndex(graph.nodes);
  return graph;
}
