/**
 * @file metadata-store.ts
 * @description MetadataStore — 사전 계산된 메타데이터 JSON 영속화/역직렬화
 *
 * 저장 위치: {vault}/.coffaen/
 * 형식: JSON (외부 의존성 제로, 디버깅 가능)
 * 원칙: .coffaen/ 전체 삭제 후 원본 마크다운에서 완전 재빌드 가능
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { NodeId } from '../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
  SerializedGraph,
} from '../types/graph.js';

/** .coffaen/ 파일 이름 상수 */
export const CACHE_FILES = {
  INDEX: 'index.json',
  WEIGHTS: 'weights.json',
  SNAPSHOT: 'snapshot.json',
  COMMUNITIES: 'communities.json',
  STALE_NODES: 'stale-nodes.json',
} as const;

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

/** Stale 노드 목록 */
export interface StaleNodes {
  /** 무효화된 노드 경로 목록 */
  paths: string[];
  /** 마지막 업데이트 */
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
 * MetadataStore: .coffaen/ 디렉토리에 메타데이터를 읽고 쓴다.
 */
export class MetadataStore {
  private readonly cacheDir: string;

  constructor(vaultPath: string) {
    this.cacheDir = join(vaultPath, '.coffaen');
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
   * KnowledgeGraph를 index.json에 저장한다.
   */
  async saveGraph(graph: KnowledgeGraph): Promise<void> {
    await this.ensureCacheDir();
    const serialized = serializeGraph(graph);
    await writeFile(
      join(this.cacheDir, CACHE_FILES.INDEX),
      JSON.stringify(serialized, null, 2),
      'utf-8',
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
   * 가중치 데이터를 weights.json에 저장한다.
   */
  async saveWeights(data: WeightsData): Promise<void> {
    await this.ensureCacheDir();
    await writeFile(
      join(this.cacheDir, CACHE_FILES.WEIGHTS),
      JSON.stringify(data, null, 2),
      'utf-8',
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
   * 파일 스냅샷을 snapshot.json에 저장한다.
   */
  async saveSnapshot(snapshot: FileSnapshot): Promise<void> {
    await this.ensureCacheDir();
    await writeFile(
      join(this.cacheDir, CACHE_FILES.SNAPSHOT),
      JSON.stringify(snapshot, null, 2),
      'utf-8',
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
   * stale-nodes.json에서 무효화 노드 목록을 로드한다.
   */
  async loadStaleNodes(): Promise<StaleNodes> {
    try {
      const raw = await readFile(
        join(this.cacheDir, CACHE_FILES.STALE_NODES),
        'utf-8',
      );
      return JSON.parse(raw) as StaleNodes;
    } catch {
      return { paths: [], updatedAt: new Date().toISOString() };
    }
  }

  /**
   * stale-nodes.json에 무효화 노드를 추가한다 (append-only).
   */
  async appendStaleNodes(paths: string[]): Promise<void> {
    await this.ensureCacheDir();
    const existing = await this.loadStaleNodes();
    const merged = Array.from(new Set([...existing.paths, ...paths]));
    const updated: StaleNodes = {
      paths: merged,
      updatedAt: new Date().toISOString(),
    };
    await writeFile(
      join(this.cacheDir, CACHE_FILES.STALE_NODES),
      JSON.stringify(updated, null, 2),
      'utf-8',
    );
  }

  /**
   * stale-nodes.json을 초기화한다 (전체 재빌드 후 호출).
   */
  async clearStaleNodes(): Promise<void> {
    await this.ensureCacheDir();
    const data: StaleNodes = { paths: [], updatedAt: new Date().toISOString() };
    await writeFile(
      join(this.cacheDir, CACHE_FILES.STALE_NODES),
      JSON.stringify(data, null, 2),
      'utf-8',
    );
  }

  /**
   * Stale 노드 비율을 계산한다.
   * 10% 초과 시 전체 재빌드 권장.
   */
  async getStaleRatio(totalNodes: number): Promise<number> {
    if (totalNodes === 0) return 0;
    const stale = await this.loadStaleNodes();
    return stale.paths.length / totalNodes;
  }
}
