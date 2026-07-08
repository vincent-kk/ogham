/**
 * v1 확산 엔진(BFS max-전파) 이식 — ../source/core/spreadingActivation.ts 의
 * runSpreadingActivation 로직을 타입만 제거해 그대로 옮긴 것. 로직 변경 금지.
 */
import { EDGE_TYPE_MULTIPLIER } from "./constants.mjs";
import { buildAdjacencyList } from "./graphBuild.mjs";
import { LAYER_DECAY_FACTORS, SUBLAYER_DECAY_FACTORS } from "./constants.mjs";

function getLayerDecay(layer, subLayer) {
  if (subLayer && subLayer in SUBLAYER_DECAY_FACTORS)
    return SUBLAYER_DECAY_FACTORS[subLayer];

  return LAYER_DECAY_FACTORS[layer] ?? 0.7;
}

function getEdgeType(graph, from, to) {
  if (graph.edgeTypeMap) return graph.edgeTypeMap.get(from)?.get(to) ?? "LINK";

  const edge = graph.edges.find((e) => e.from === from && e.to === to);
  return edge?.type ?? "LINK";
}

function getEdgeWeight(graph, from, to) {
  const baseWeight = graph.edgeWeightMap
    ? (graph.edgeWeightMap.get(from)?.get(to) ?? 0.5)
    : (graph.edges.find((e) => e.from === from && e.to === to)?.weight ?? 0.5);

  const edgeType = getEdgeType(graph, from, to);
  return baseWeight * EDGE_TYPE_MULTIPLIER[edgeType];
}

function getDecayForNode(graph, nodeId, decayOverride) {
  if (decayOverride !== undefined) return decayOverride;
  const node = graph.nodes.get(nodeId);
  if (!node) return 0.7;
  return getLayerDecay(node.layer, node.subLayer);
}

function capSiblingFanout(graph, from, neighbors, cap) {
  if (!Number.isFinite(cap) || neighbors.length <= cap) return neighbors;

  const siblings = [];
  const others = [];
  for (const to of neighbors)
    if (getEdgeType(graph, from, to) === "SIBLING") siblings.push(to);
    else others.push(to);

  if (siblings.length <= cap) return neighbors;

  siblings.sort((a, b) => {
    const pa = graph.nodes.get(a)?.pagerank ?? 0;
    const pb = graph.nodes.get(b)?.pagerank ?? 0;
    if (pb !== pa) return pb - pa;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return [...others, ...siblings.slice(0, cap)];
}

function processNeighbor(
  graph,
  current,
  neighborId,
  params,
  activationMap,
  queue,
) {
  const { threshold, maxHops, decayOverride } = params;

  if (!graph.nodes.has(neighborId)) return;

  if (current.path.includes(neighborId)) return;

  const decay = getDecayForNode(graph, current.nodeId, decayOverride);
  const weight = getEdgeWeight(graph, current.nodeId, neighborId);
  const newActivation = current.activation * weight * decay;

  if (newActivation < threshold) return;

  const cappedActivation = Math.min(newActivation, 1.0);
  const newPath = [...current.path, neighborId];
  const newHops = current.hops + 1;

  const existing = activationMap.get(neighborId);
  if (existing && existing.score >= cappedActivation) return;

  activationMap.set(neighborId, {
    nodeId: neighborId,
    score: cappedActivation,
    hops: newHops,
    path: newPath,
  });

  if (newHops < maxHops)
    queue.push({
      nodeId: neighborId,
      activation: cappedActivation,
      hops: newHops,
      path: newPath,
    });
}

export function runSpreadingActivation(graph, seedIds, params = {}) {
  const threshold = params.threshold ?? 0.1;
  const maxHops = params.maxHops ?? 5;
  const maxActiveNodes = params.maxActiveNodes ?? 100;
  const decayOverride = params.decayOverride;
  const seedActivations = params.seedActivations;
  const siblingFanoutCap = params.siblingFanoutCap ?? Infinity;
  const resolvedParams = {
    threshold,
    maxHops,
    maxActiveNodes,
    decayOverride,
    seedActivations,
  };

  const activationMap = new Map();
  const queue = [];

  for (const seedId of seedIds) {
    if (!graph.nodes.has(seedId)) continue;

    const seedScore = resolvedParams.seedActivations?.get(seedId) ?? 1.0;
    const existing = activationMap.get(seedId);
    if (!existing || existing.score < seedScore)
      activationMap.set(seedId, {
        nodeId: seedId,
        score: seedScore,
        hops: 0,
        path: [seedId],
      });

    queue.push({
      nodeId: seedId,
      activation: seedScore,
      hops: 0,
      path: [seedId],
    });
  }

  const adj =
    graph.adjacencyList ?? buildAdjacencyList(graph.nodes, graph.edges);

  let queueHead = 0;
  while (queueHead < queue.length && activationMap.size <= maxActiveNodes) {
    const current = queue[queueHead++];

    if (current.hops >= maxHops) continue;

    const neighbors = adj.get(current.nodeId);
    if (neighbors) {
      const ordered = capSiblingFanout(
        graph,
        current.nodeId,
        neighbors,
        siblingFanoutCap,
      );
      for (const neighborId of ordered)
        processNeighbor(
          graph,
          current,
          neighborId,
          resolvedParams,
          activationMap,
          queue,
        );
    }
  }

  return Array.from(activationMap.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const pa = graph.nodes.get(a.nodeId)?.pagerank ?? 0;
    const pb = graph.nodes.get(b.nodeId)?.pagerank ?? 0;
    return pb - pa;
  });
}
