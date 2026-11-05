/**
 * @file metadataStore.ts
 * @description MetadataStore — 사전 계산된 메타데이터 JSON 영속화/역직렬화
 *
 * 저장 위치: {vault}/.maencof/
 * 형식: JSON (외부 의존성 제로, 디버깅 가능)
 * 원칙: .maencof/ 전체 삭제 후 원본 마크다운에서 완전 재빌드 가능
 */
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import {
  ATOMIC_WRITE_RETRY_ATTEMPTS as STALE_RETRY_ATTEMPTS,
  ATOMIC_WRITE_RETRY_BACKOFF_MS as STALE_RETRY_BACKOFF_MS,
} from '../../../../constants/atomicWrite.js';
// CACHE_FILES 는 단일 출처 constants/cacheFiles.ts. 본 모듈은 외부 호환을 위해 re-export 만 한다.
import { CACHE_FILES } from '../../../../constants/cacheFiles.js';
import type {
  ArchiveClusterMember,
  KnowledgeGraph,
  SerializedArchiveMembers,
  SerializedEdges,
  SerializedGraphMeta,
  SerializedNodes,
} from '../../../../types/graph.js';
import { hydrateRuntimeMaps } from '../../../graphBuilder/index.js';
import { parseGenerationShard } from '../../../utils/parseGenerationShard.js';
import { parseGraphGeneration } from '../../../utils/parseGraphGeneration.js';
import type {
  FileSnapshot,
  StaleEntries,
  StaleEntry,
  WeightsData,
} from '../types/types.js';

import { atomicWriteJson } from './atomicWriteJson.js';
import { deserializeShards } from './deserializeShards.js';
import { withVaultLock } from './withVaultLock.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { CACHE_FILES };

/** 레거시 영속 스키마 — 자동 호환 로더 전용 */
interface LegacyStaleNodes {
  paths: string[];
  updatedAt: string;
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
  /** 저장소 밖 진단 기록은 호출자가 소유하며 동기 콜백 실패는 격리한다. */
  private readonly onLoadError?: (error: unknown) => void;

  /**
   * @param vaultPath 캐시를 소유한 vault 루트.
   * @param onLoadError ENOENT 이외 읽기 실패를 받는 선택적 동기 진단 통로.
   */
  constructor(vaultPath: string, onLoadError?: (error: unknown) => void) {
    this.vaultPath = vaultPath;
    this.cacheDir = join(vaultPath, '.maencof');
    this.onLoadError = onLoadError;
  }

  /**
   * @param error 읽기 경계가 잡은 오류. 파일 부재는 정상 cache miss로 취급한다.
   * @returns 없음. 호출자 진단이 실패해도 읽기의 기존 폴백 결과를 유지한다.
   */
  private reportLoadError(error: unknown): void {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    )
      return;
    try {
      this.onLoadError?.(error);
    } catch {
      // 진단 통로의 실패가 읽기의 cache miss를 예외로 바꾸지 않는다.
    }
  }

  /**
   * 캐시 디렉토리가 없으면 생성한다.
   */
  async ensureCacheDir(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
  }

  /** @returns 현재 세대의 모든 그래프 샤드를 읽을 수 있을 때만 true. */
  async cacheExists(): Promise<boolean> {
    return (await this.loadGraph()) !== null;
  }

  /**
   * @param graph 새 불변 세대에 저장할 그래프. 기존 호출자가 가진 데이터는 변경하지 않는다.
   * @returns 샤드 완성 후 고정 마커를 공개하고 직전 세대를 정리하면 완료한다.
   */
  async saveGraph(graph: KnowledgeGraph): Promise<void> {
    await this.ensureCacheDir();
    await withVaultLock(this.vaultPath, async () => {
      const generation = randomUUID();
      const dir = join(this.cacheDir, CACHE_FILES.GENERATIONS, generation);
      await mkdir(dir, { recursive: true });
      const nodes: SerializedNodes = Array.from(graph.nodes.values());
      const edges: SerializedEdges = graph.edges;
      const archiveMembers: SerializedArchiveMembers =
        graph.archiveClusterMembers
          ? Array.from(graph.archiveClusterMembers.values()).flat()
          : [];
      await Promise.all([
        atomicWriteJson(join(dir, CACHE_FILES.NODES), {
          generation,
          data: nodes,
        }),
        atomicWriteJson(join(dir, CACHE_FILES.EDGES), {
          generation,
          data: edges,
        }),
        atomicWriteJson(join(dir, CACHE_FILES.ARCHIVE_MEMBERS), {
          generation,
          data: archiveMembers,
        }),
      ]);
      let previous: SerializedGraphMeta | null = null;
      try {
        previous = parseGraphGeneration(
          await readFile(join(this.cacheDir, CACHE_FILES.GRAPH_META), 'utf-8'),
        );
      } catch {
        // 구포맷/손상 마커는 새 세대의 공개를 막지 않는다.
      }
      const meta: SerializedGraphMeta = {
        builtAt: graph.builtAt,
        nodeCount: graph.nodeCount,
        edgeCount: graph.edgeCount,
        schemaVersion: 3,
        generation,
      };
      await atomicWriteJson(join(this.cacheDir, CACHE_FILES.GRAPH_META), meta);
      if (previous)
        await rm(
          join(this.cacheDir, CACHE_FILES.GENERATIONS, previous.generation),
          { recursive: true, force: true },
        );
      await this.unlinkLegacyIndex();
    });
  }

  /**
   * @returns 마커가 가리키는 단일 세대의 그래프. 구포맷·미완·불일치는 null이다.
   * 읽기는 파일을 쓰거나 legacy 캐시를 마이그레이션하지 않는다.
   */
  async loadGraph(): Promise<KnowledgeGraph | null> {
    try {
      const meta = parseGraphGeneration(
        await readFile(join(this.cacheDir, CACHE_FILES.GRAPH_META), 'utf-8'),
      );
      if (!meta) return null;
      const dir = join(this.cacheDir, CACHE_FILES.GENERATIONS, meta.generation);
      const [nodesRaw, edgesRaw, membersRaw] = await Promise.all([
        readFile(join(dir, CACHE_FILES.NODES), 'utf-8'),
        readFile(join(dir, CACHE_FILES.EDGES), 'utf-8'),
        readFile(join(dir, CACHE_FILES.ARCHIVE_MEMBERS), 'utf-8'),
      ]);
      const nodes = parseGenerationShard<SerializedNodes[number]>(
        nodesRaw,
        meta.generation,
      );
      const edges = parseGenerationShard<SerializedEdges[number]>(
        edgesRaw,
        meta.generation,
      );
      const members = parseGenerationShard<ArchiveClusterMember>(
        membersRaw,
        meta.generation,
      );
      const graph = hydrateRuntimeMaps(deserializeShards(nodes, edges, meta));
      const map = new Map<string, ArchiveClusterMember[]>();
      for (const member of members) {
        const list = map.get(member.clusterKey);
        if (list) list.push(member);
        else map.set(member.clusterKey, [member]);
      }
      graph.archiveClusterMembers = map;
      return graph;
    } catch (error) {
      this.reportLoadError(error);
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
    } catch (error) {
      this.reportLoadError(error);
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
    } catch (error) {
      this.reportLoadError(error);
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
        StaleEntries | LegacyStaleNodes | Record<string, unknown>;
      if (parsed && Array.isArray((parsed as StaleEntries).entries))
        return parsed as StaleEntries;

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
    } catch (error) {
      this.reportLoadError(error);
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
      for (let attempt = 0; attempt < STALE_RETRY_ATTEMPTS; attempt++)
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
          if (attempt < STALE_RETRY_ATTEMPTS - 1)
            await sleep(STALE_RETRY_BACKOFF_MS);
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
