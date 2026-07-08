/**
 * v1 쿼리 파이프라인 이식 — ../source/search/queryEngine.ts 의 시드 해석
 * (classifyMatch/다토큰 AND/phrase 보너스/시드 캡) + 적응형 SA + legacy 분기 +
 * Layer 필터 + path-exact 제외. 캐시(queryCache)만 제외(벤치마크 무관). 로직 변경 금지.
 */
import {
  KEYWORD_SEED_CAP,
  PATH_PREFIX_MATCH_SCORE,
  PATH_PREFIX_SEED_CAP,
  PHRASE_CONTIGUITY_BONUS,
  SIBLING_FANOUT_CAP,
  WORD_BOUNDARY_SPLIT_REGEX,
} from "./constants.mjs";
import { runSpreadingActivation } from "./engineV1.mjs";

function classifyMatch(node, keyword) {
  const kw = keyword.toLowerCase();
  const titleLower = node.title.toLowerCase();

  if (titleLower === kw) return { score: 1.0, type: "title-exact" };

  const titleWords = titleLower.split(/[\s\-_/\\.,;:!?()[\]{}'"]+/);
  if (titleWords.some((w) => w === kw))
    return { score: 0.8, type: "title-word" };

  if (node.tags.some((t) => t.toLowerCase() === kw))
    return { score: 0.5, type: "tag-exact" };

  if (node.tags.some((t) => t.toLowerCase().startsWith(kw)))
    return { score: 0.3, type: "tag-prefix" };

  if (titleLower.includes(kw)) return { score: 0.8, type: "title-word" };

  return { score: 0.3, type: "tag-prefix" };
}

function tokenizeSeed(seed) {
  const tokens = [];
  for (const part of seed.split(WORD_BOUNDARY_SPLIT_REGEX)) {
    const lower = part.toLowerCase();
    if (lower.length > 0) tokens.push(lower);
  }
  return tokens;
}

function normalizePhrase(s) {
  return tokenizeSeed(s).join(" ");
}

function candidatesForToken(graph, token) {
  const ids = new Set();
  if (graph.invertedIndex)
    for (const [term, nodeIds] of graph.invertedIndex) {
      if (term.startsWith(token)) for (const id of nodeIds) ids.add(id);
    }
  else
    for (const [id, node] of graph.nodes) {
      const titleMatch = node.title.toLowerCase().includes(token);
      const tagMatch = node.tags.some((tag) =>
        tag.toLowerCase().includes(token),
      );
      if (titleMatch || tagMatch) ids.add(id);
    }

  return ids;
}

function intersectCandidateSets(sets) {
  if (sets.length === 0) return new Set();
  let smallest = sets[0];
  for (const s of sets) if (s.size < smallest.size) smallest = s;
  const result = new Set();
  for (const id of smallest) if (sets.every((s) => s.has(id))) result.add(id);

  return result;
}

function capSeedsByPagerank(graph, ids, cap) {
  if (ids.length <= cap) return ids;
  return ids
    .map((id) => graph.nodes.get(id))
    .filter((n) => n !== undefined)
    .sort((a, b) => {
      const pa = a.pagerank ?? 0;
      const pb = b.pagerank ?? 0;
      if (pb !== pa) return pb - pa;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .slice(0, cap)
    .map((n) => n.id);
}

function classifyMultiToken(node, tokens, phrase) {
  const titleNorm = normalizePhrase(node.title);
  if (phrase.length > 0 && titleNorm === phrase)
    return { score: 1.0, type: "title-exact" };

  let minScore = 1.0;
  let worstType = "title-word";
  for (const token of tokens) {
    const { score, type } = classifyMatch(node, token);
    if (score < minScore) {
      minScore = score;
      worstType = type;
    }
  }
  const contiguous = phrase.length > 0 && titleNorm.includes(phrase);
  const score = Math.min(
    1.0,
    minScore + (contiguous ? PHRASE_CONTIGUITY_BONUS : 0),
  );
  return { score, type: contiguous ? "title-word" : worstType };
}

function resolvePathSeed(graph, seed, bestScores) {
  if (graph.nodes.has(seed)) {
    const existing = bestScores.get(seed);
    if (!existing || existing.matchScore < 1.0)
      bestScores.set(seed, {
        nodeId: seed,
        matchScore: 1.0,
        matchType: "path-exact",
      });

    return;
  }

  const prefix = seed.endsWith("/") ? seed : `${seed}/`;
  const memberIds = [];
  for (const [id, node] of graph.nodes)
    if (node.path.startsWith(prefix)) memberIds.push(id);

  if (memberIds.length === 0) return;

  for (const id of capSeedsByPagerank(graph, memberIds, PATH_PREFIX_SEED_CAP)) {
    const existing = bestScores.get(id);
    if (!existing || existing.matchScore < PATH_PREFIX_MATCH_SCORE)
      bestScores.set(id, {
        nodeId: id,
        matchScore: PATH_PREFIX_MATCH_SCORE,
        matchType: "tag-exact",
      });
  }
}

function resolveKeywordSeed(graph, seed, bestScores) {
  const tokens = tokenizeSeed(seed);
  if (tokens.length === 0) return;

  const multiToken = tokens.length > 1;
  const candidateIds = multiToken
    ? intersectCandidateSets(tokens.map((t) => candidatesForToken(graph, t)))
    : candidatesForToken(graph, tokens[0]);

  const phrase = multiToken ? normalizePhrase(seed) : "";

  const scored = [];
  for (const id of candidateIds) {
    const node = graph.nodes.get(id);
    if (!node) continue;
    const { score, type } = multiToken
      ? classifyMultiToken(node, tokens, phrase)
      : classifyMatch(node, tokens[0]);
    scored.push({ id, score, type, pagerank: node.pagerank ?? 0 });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.pagerank - a.pagerank ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );

  for (const { id, score, type } of scored.slice(0, KEYWORD_SEED_CAP)) {
    const existing = bestScores.get(id);
    if (!existing || existing.matchScore < score)
      bestScores.set(id, { nodeId: id, matchScore: score, matchType: type });
  }
}

export function resolveSeedNodes(graph, seeds) {
  const bestScores = new Map();

  for (const seed of seeds)
    if (seed.endsWith(".md") || seed.includes("/"))
      resolvePathSeed(graph, seed, bestScores);
    else resolveKeywordSeed(graph, seed, bestScores);

  return Array.from(bestScores.values());
}

function applyLayerFilter(results, graph, layerFilter) {
  if (layerFilter.length === 0) return results;
  return results.filter((r) => {
    const node = graph.nodes.get(r.nodeId);
    return node && layerFilter.includes(node.layer);
  });
}

export function query(graph, seeds, options = {}) {
  const {
    maxResults = 10,
    decay = 0.7,
    threshold = 0.1,
    maxHops = 5,
    layerFilter = [],
  } = options;

  const scoredSeeds = resolveSeedNodes(graph, seeds);
  const seedIds = scoredSeeds.map((s) => s.nodeId);

  let results = [];

  if (scoredSeeds.length > 0) {
    const seedActivations = new Map();
    for (const s of scoredSeeds) seedActivations.set(s.nodeId, s.matchScore);

    let adaptedMaxHops = maxHops;
    let adaptedThreshold = threshold;
    const useAdaptive =
      options.adaptiveSA !== false && options.maxHops === undefined;

    if (useAdaptive && scoredSeeds.length > 0) {
      const maxScore = Math.max(...scoredSeeds.map((s) => s.matchScore));
      const avgScore =
        scoredSeeds.reduce((sum, s) => sum + s.matchScore, 0) /
        scoredSeeds.length;
      const isStrongSignal =
        scoredSeeds.length === 1 &&
        maxScore >= 0.9 &&
        (scoredSeeds[0].matchType === "path-exact" ||
          scoredSeeds[0].matchType === "title-exact");

      if (isStrongSignal) {
        adaptedMaxHops = Math.min(adaptedMaxHops, 2);
        adaptedThreshold = Math.max(adaptedThreshold, 0.05);
      } else if (avgScore >= 0.6) adaptedMaxHops = Math.min(adaptedMaxHops, 3);
    }

    const saParams = {
      threshold: adaptedThreshold,
      maxHops: adaptedMaxHops,
      maxActiveNodes: 100,
      decayOverride: decay,
      seedActivations,
      siblingFanoutCap: SIBLING_FANOUT_CAP,
    };

    results = runSpreadingActivation(graph, seedIds, saParams);
  }

  if (layerFilter.length > 0)
    results = applyLayerFilter(results, graph, layerFilter);

  const pathExactSeedSet = new Set(
    scoredSeeds
      .filter((s) => s.matchType === "path-exact")
      .map((s) => s.nodeId),
  );
  const filtered = results
    .filter((r) => !pathExactSeedSet.has(r.nodeId))
    .slice(0, maxResults);

  return {
    results: filtered,
    seedIds,
    exploredNodes: results.length,
  };
}
