/**
 * @file metadataStore.ts
 * @description MetadataStore — 사전 계산된 메타데이터 JSON 영속화/역직렬화
 *
 * 저장 위치: {vault}/.maencof/
 * 형식: JSON (외부 의존성 제로, 디버깅 가능)
 * 원칙: .maencof/ 전체 삭제 후 원본 마크다운에서 완전 재빌드 가능
 */
import { access, mkdir, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import {
  ATOMIC_WRITE_RETRY_ATTEMPTS as STALE_RETRY_ATTEMPTS,
  ATOMIC_WRITE_RETRY_BACKOFF_MS as STALE_RETRY_BACKOFF_MS,
} from '../../../constants/atomicWrite.js';
// CACHE_FILES 는 단일 출처 constants/cacheFiles.ts. 본 모듈은 외부 호환을 위해 re-export 만 한다.
import { CACHE_FILES } from '../../../constants/cacheFiles.js';
import type { NodeId } from '../../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
  SerializedEdges,
  SerializedGraph,
  SerializedGraphMeta,
  SerializedNodes,
} from '../../../types/graph.js';
import { hydrateRuntimeMaps } from '../../graphBuilder/index.js';

import { atomicWriteJson } from './atomicWrite.js';
import { withVaultLock } from './fileMutex.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { CACHE_FILES };

/** 파일 스냅샷 항목 */
export interface SnapshotEntry {
  /** 상대 경로 */
  path: string;
  /** 파일 수정 시간 (Unix timestamp ms) */
  mtime: number;
  /** 파일 크기 (bytes) */
  size: number;
}

/** 파일 스냅샷 */
export interface FileSnapshot {
  entries: SnapshotEntry[];
  capturedAt: string;
}

/** 가중치 저장 형식 */
export interface WeightsData {
  /** 엣지별 가중치 (from→to: weight) */
  edgeWeights: Array<{ from: string; to: string; weight: number }>;
  /** 노드별 PageRank 점수 */
  nodePageranks: Array<{ id: string; score: number }>;
  /** 계산 시간 */
  calculatedAt: string;
}

/** Stale 엔트리 — path 와 의도된 작업(op) 을 함께 기록한다. */
export interface StaleEntry {
  /** 변경 대상 노드 경로 */
  path: string;
  /** 작업 의도. 'mutate' = 생성/갱신 (read-and-replace), 'delete' = 노드 제거. */
  op: 'mutate' | 'delete';
}

/** Stale 엔트리 목록 */
export interface StaleEntries {
  entries: StaleEntry[];
  /** 마지막 업데이트 */
  updatedAt: string;
}

/** 레거시 영속 스키마 — 자동 호환 로더 전용 */
interface LegacyStaleNodes {
  paths: string[];
  updatedAt: string;
}

/**
 * KnowledgeGraph를 직렬화 가능한 형식으로 변환한다.
 */
export function serializeGraph(graph: KnowledgeGraph): SerializedGraph {
  return {
    nodes: Array.from(graph.nodes.values()),
    edges: graph.edges,
    builtAt: graph.builtAt,
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
  };
}

/**
 * 직렬화된 그래프를 KnowledgeGraph로 복원한다 (legacy index.json 경로).
 */
export function deserializeGraph(data: SerializedGraph): KnowledgeGraph {
  const nodes = new Map<NodeId, KnowledgeNode>();
  for (const node of data.nodes) {
    nodes.set(node.id, node);
  }

  return {
    nodes,
    edges: data.edges as KnowledgeEdge[],
    builtAt: data.builtAt,
    nodeCount: data.nodeCount,
    edgeCount: data.edgeCount,
  };
}

/**
 * 3-파일 shard(nodes/edges/graph-meta) 를 KnowledgeGraph 로 복원한다.
 */
export function deserializeShards(
  nodesArr: SerializedNodes,
  edgesArr: SerializedEdges,
  meta: SerializedGraphMeta,
): KnowledgeGraph {
  const nodes = new Map<NodeId, KnowledgeNode>();
  for (const node of nodesArr) {
    nodes.set(node.id, node);
  }
  return {
    nodes,
    edges: edgesArr as KnowledgeEdge[],
    builtAt: meta.builtAt,
    nodeCount: meta.nodeCount,
    edgeCount: meta.edgeCount,
  };
}

/**
 * MetadataStore: .maencof/ 디렉토리에 메타데이터를 읽고 쓴다.
 *
 * 모든 쓰기는 atomic-write(tmp + rename) + per-vault mutex로 직렬화된다.
 * 시그니처는 외부 호환성을 위해 유지한다.
 */
export class MetadataStore {
  private readonly vaultPath: string;
  private readonly cacheDir: string;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
    this.cacheDir = join(vaultPath, '.maencof');
  }

  /**
   * 캐시 디렉토리가 없으면 생성한다.
   */
  async ensureCacheDir(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
  }

  /**
   * 캐시 디렉토리 존재 여부를 확인한다.
   * 신규 샤드 commit marker(graph-meta.json) 우선, 없으면 legacy index.json 검사.
   */
  async cacheExists(): Promise<boolean> {
    try {
      await access(join(this.cacheDir, CACHE_FILES.GRAPH_META));
      return true;
    } catch {
      // fall through to legacy
    }
    try {
      await access(join(this.cacheDir, CACHE_FILES.INDEX));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * KnowledgeGraph를 nodes.json + edges.json + graph-meta.json 3 파일로 저장한다.
   *
   * - 단일 vault lock 안에서 nodes/edges 병렬 쓰기 → graph-meta(commit marker)를 마지막에 쓴다.
   * - 성공 후 legacy index.json 이 남아있으면 best-effort 로 정리한다 (ENOENT swallow).
   * - 모든 쓰기는 atomicWriteJson(tmp + rename)으로 per-file atomicity 보장.
   */
  async saveGraph(graph: KnowledgeGraph): Promise<void> {
    await this.ensureCacheDir();
    const nodes: SerializedNodes = Array.from(graph.nodes.values());
    const edges: SerializedEdges = graph.edges;
    const meta: SerializedGraphMeta = {
      builtAt: graph.builtAt,
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
      schemaVersion: 2,
    };

    await withVaultLock(this.vaultPath, async () => {
      await Promise.all([
        atomicWriteJson(join(this.cacheDir, CACHE_FILES.NODES), nodes),
        atomicWriteJson(join(this.cacheDir, CACHE_FILES.EDGES), edges),
      ]);
      // commit marker — 이 파일이 존재해야 cache 가 commit 된 것으로 간주
      await atomicWriteJson(join(this.cacheDir, CACHE_FILES.GRAPH_META), meta);
      // legacy 정리 — 이전 단일 index.json 이 남아있으면 제거
      await this.unlinkLegacyIndex();
    });
  }

  /**
   * 3 파일에서 KnowledgeGraph를 로드한다.
   *
   * 분기 정책:
   * - graph-meta.json (commit marker) 부재 → 신규 layout 미commit 상태. legacy 마이그레이션 경로 진입.
   *   * 이 분기는 fresh vault / partial-shard(nodes/edges 만 있고 commit 미완) / legacy-only 를 모두 포괄한다.
   *   * partial-shard 의 nodes/edges 는 commit 되지 않았으므로 사용하지 않으며, legacy 가 없으면 null.
   * - graph-meta.json 존재 → 정상 commit. schemaVersion 검증 후 nodes/edges 병렬 로드.
   *   * schemaVersion ≠ 2 → 알 수 없는 버전, null (호출자가 재빌드 결정).
   *   * commit 후 nodes/edges read 실패는 real I/O 오류로 간주, legacy 로 폴백하지 않고 null.
   */
  async loadGraph(): Promise<KnowledgeGraph | null> {
    let metaRaw: string;
    try {
      metaRaw = await readFile(
        join(this.cacheDir, CACHE_FILES.GRAPH_META),
        'utf-8',
      );
    } catch {
      // commit marker 부재 — legacy 마이그레이션 트리거 (legacy 도 없으면 null)
      return this.loadLegacyAndMigrate();
    }

    try {
      const meta = JSON.parse(metaRaw) as SerializedGraphMeta;
      if (meta.schemaVersion !== 2) {
        // 미래 또는 손상된 schemaVersion — cache miss 로 처리하여 호출자 재빌드 유도
        return null;
      }
      const [nodesRaw, edgesRaw] = await Promise.all([
        readFile(join(this.cacheDir, CACHE_FILES.NODES), 'utf-8'),
        readFile(join(this.cacheDir, CACHE_FILES.EDGES), 'utf-8'),
      ]);
      const nodesArr = JSON.parse(nodesRaw) as SerializedNodes;
      const edgesArr = JSON.parse(edgesRaw) as SerializedEdges;
      // 디스크 샤드는 nodes/edges 만 보존하므로, 런타임 조회 맵(invertedIndex·adjacency·
      // edgeWeight/Type)을 빌드와 동일 로직으로 재수화해 빌드직후/리로드 동작을 일치시킨다.
      return hydrateRuntimeMaps(deserializeShards(nodesArr, edgesArr, meta));
    } catch {
      // commit marker 는 있으나 부속 파일 read/parse 실패 — legacy 로 폴백하지 않고 cache miss
      return null;
    }
  }

  /**
   * legacy index.json 을 1회 자동 마이그레이션한다.
   * 성공 시 신규 샤드를 즉시 saveGraph 로 commit (이 과정에서 legacy 파일은 unlink 됨).
   * 부재 시 null.
   *
   * 잠금 경계:
   * - legacy read 자체는 vault lock 밖에서 수행 (read-only fast path).
   * - 신규 샤드 commit + legacy unlink 는 `saveGraph` 가 자체 vault lock 안에서 직렬화.
   * - read 와 saveGraph 사이에는 잠금이 끊긴 짧은 윈도우가 존재한다. 동일 vault 에 대한 다른 writer 가
   *   그 윈도우에서 saveGraph 로 신규 데이터를 commit 한 경우, 본 함수의 saveGraph 가 legacy 데이터로
   *   해당 신규 데이터를 덮어쓸 수 있는 이론적 race 가 있다. legacy v1 layout 은 v2 마이그레이션 후
   *   1회만 잔존하므로 cold-start 첫 호출에서만 트리거되며, 동시 saveGraph 충돌은 무시 수준이다.
   *   더 강한 보장이 필요해질 경우 read 를 lock 안으로 옮겨야 한다.
   */
  private async loadLegacyAndMigrate(): Promise<KnowledgeGraph | null> {
    try {
      const raw = await readFile(
        join(this.cacheDir, CACHE_FILES.INDEX),
        'utf-8',
      );
      const data = JSON.parse(raw) as SerializedGraph;
      const graph = deserializeGraph(data);
      // 즉시 신규 layout 으로 재기록 — 다음 호출부터는 fast path
      await this.saveGraph(graph);
      // 반환 graph 도 런타임 맵을 재수화해 shard 경로와 동일한 servable 상태로 맞춘다.
      return hydrateRuntimeMaps(graph);
    } catch {
      return null;
    }
  }

  /** Best-effort legacy index.json unlink. ENOENT swallow. */
  private async unlinkLegacyIndex(): Promise<void> {
    try {
      await unlink(join(this.cacheDir, CACHE_FILES.INDEX));
    } catch {
      // ENOENT 등 모두 무시
    }
  }

  /**
   * 가중치 데이터를 weights.json에 atomic write로 저장한다.
   */
  async saveWeights(data: WeightsData): Promise<void> {
    await this.ensureCacheDir();
    await withVaultLock(this.vaultPath, () =>
      atomicWriteJson(join(this.cacheDir, CACHE_FILES.WEIGHTS), data),
    );
  }

  /**
   * weights.json에서 가중치 데이터를 로드한다.
   */
  async loadWeights(): Promise<WeightsData | null> {
    try {
      const raw = await readFile(
        join(this.cacheDir, CACHE_FILES.WEIGHTS),
        'utf-8',
      );
      return JSON.parse(raw) as WeightsData;
    } catch {
      return null;
    }
  }

  /**
   * 파일 스냅샷을 snapshot.json에 atomic write로 저장한다.
   */
  async saveSnapshot(snapshot: FileSnapshot): Promise<void> {
    await this.ensureCacheDir();
    await withVaultLock(this.vaultPath, () =>
      atomicWriteJson(join(this.cacheDir, CACHE_FILES.SNAPSHOT), snapshot),
    );
  }

  /**
   * snapshot.json에서 파일 스냅샷을 로드한다.
   */
  async loadSnapshot(): Promise<FileSnapshot | null> {
    try {
      const raw = await readFile(
        join(this.cacheDir, CACHE_FILES.SNAPSHOT),
        'utf-8',
      );
      return JSON.parse(raw) as FileSnapshot;
    } catch {
      return null;
    }
  }

  /**
   * stale-nodes.json 에서 무효화 엔트리 목록을 로드한다.
   *
   * 레거시 `{ paths: string[] }` 스키마는 자동으로 `{ entries: [{path, op:'mutate'}, ...] }` 로 승격된다.
   */
  async loadStaleEntries(): Promise<StaleEntries> {
    try {
      const raw = await readFile(
        join(this.cacheDir, CACHE_FILES.STALE_NODES),
        'utf-8',
      );
      const parsed = JSON.parse(raw) as
        | StaleEntries
        | LegacyStaleNodes
        | Record<string, unknown>;
      if (parsed && Array.isArray((parsed as StaleEntries).entries)) {
        return parsed as StaleEntries;
      }
      if (parsed && Array.isArray((parsed as LegacyStaleNodes).paths)) {
        const legacy = parsed as LegacyStaleNodes;
        return {
          entries: legacy.paths.map((path) => ({
            path,
            op: 'mutate' as const,
          })),
          updatedAt: legacy.updatedAt ?? new Date().toISOString(),
        };
      }
      return { entries: [], updatedAt: new Date().toISOString() };
    } catch {
      return { entries: [], updatedAt: new Date().toISOString() };
    }
  }

  /**
   * stale-nodes.json 에 무효화 엔트리를 추가한다 (append-only, 동일 (path, op) 합집합).
   *
   * In-process 는 vault mutex 로 직렬화. 다중 프로세스 환경에서도 atomic rename 으로
   * partial write 를 차단하고, 실패 시 최대 3회 × 50ms backoff 로 load → merge → write 를 재시도한다.
   */
  async appendStaleEntries(entries: StaleEntry[]): Promise<void> {
    if (entries.length === 0) return;
    await this.ensureCacheDir();
    await withVaultLock(this.vaultPath, async () => {
      const stalePath = join(this.cacheDir, CACHE_FILES.STALE_NODES);
      let lastErr: unknown;
      for (let attempt = 0; attempt < STALE_RETRY_ATTEMPTS; attempt++) {
        try {
          const existing = await this.loadStaleEntries();
          const seen = new Set<string>();
          const merged: StaleEntry[] = [];
          for (const entry of [...existing.entries, ...entries]) {
            const key = `${entry.op}::${entry.path}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(entry);
          }
          const updated: StaleEntries = {
            entries: merged,
            updatedAt: new Date().toISOString(),
          };
          await atomicWriteJson(stalePath, updated, { retries: 1 });
          return;
        } catch (err) {
          lastErr = err;
          if (attempt < STALE_RETRY_ATTEMPTS - 1) {
            await sleep(STALE_RETRY_BACKOFF_MS);
          }
        }
      }
      throw lastErr;
    });
  }

  /**
   * stale-nodes.json 을 초기화한다 (전체 재빌드 후 호출). atomic write.
   */
  async clearStaleEntries(): Promise<void> {
    await this.ensureCacheDir();
    const data: StaleEntries = {
      entries: [],
      updatedAt: new Date().toISOString(),
    };
    await withVaultLock(this.vaultPath, () =>
      atomicWriteJson(join(this.cacheDir, CACHE_FILES.STALE_NODES), data),
    );
  }

  /**
   * Stale 비율을 계산한다 (entries 길이 기준). 10% 초과 시 전체 재빌드 권장.
   */
  async getStaleRatio(totalNodes: number): Promise<number> {
    if (totalNodes === 0) return 0;
    const stale = await this.loadStaleEntries();
    return stale.entries.length / totalNodes;
  }
}
