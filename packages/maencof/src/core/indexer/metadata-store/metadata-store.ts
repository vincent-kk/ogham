/**
 * @file metadata-store.ts
 * @description MetadataStore — 사전 계산된 메타데이터 JSON 영속화/역직렬화
 *
 * 저장 위치: {vault}/.maencof/
 * 형식: JSON (외부 의존성 제로, 디버깅 가능)
 * 원칙: .maencof/ 전체 삭제 후 원본 마크다운에서 완전 재빌드 가능
 */
import { access, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { NodeId } from '../../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
  SerializedGraph,
} from '../../../types/graph.js';
import { atomicWriteJson } from './atomic-write.js';
import { withVaultLock } from './file-mutex.js';

import {
  ATOMIC_WRITE_RETRY_ATTEMPTS as STALE_RETRY_ATTEMPTS,
  ATOMIC_WRITE_RETRY_BACKOFF_MS as STALE_RETRY_BACKOFF_MS,
} from '../../../constants/atomic-write.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// CACHE_FILES 는 단일 출처 constants/cache-files.ts. 본 모듈은 외부 호환을 위해 re-export 만 한다.
import { CACHE_FILES } from '../../../constants/cache-files.js';

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
 * 직렬화된 그래프를 KnowledgeGraph로 복원한다.
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
   */
  async cacheExists(): Promise<boolean> {
    try {
      await access(join(this.cacheDir, CACHE_FILES.INDEX));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * KnowledgeGraph를 index.json에 atomic write로 저장한다.
   */
  async saveGraph(graph: KnowledgeGraph): Promise<void> {
    await this.ensureCacheDir();
    const serialized = serializeGraph(graph);
    await withVaultLock(this.vaultPath, () =>
      atomicWriteJson(join(this.cacheDir, CACHE_FILES.INDEX), serialized),
    );
  }

  /**
   * index.json에서 KnowledgeGraph를 로드한다.
   */
  async loadGraph(): Promise<KnowledgeGraph | null> {
    try {
      const raw = await readFile(
        join(this.cacheDir, CACHE_FILES.INDEX),
        'utf-8',
      );
      const data = JSON.parse(raw) as SerializedGraph;
      return deserializeGraph(data);
    } catch {
      return null;
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
