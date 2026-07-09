/**
 * @file queryEngine.ts
 * @description QueryEngine 클래스 — 기본 옵션을 보관하는 query() 래퍼.
 */
import type { KnowledgeGraph } from '../../../types/graph.js';
import type { QueryOptions, QueryResult } from '../types/types.js';

import { query } from './query.js';

export class QueryEngine {
  private readonly defaultOptions: QueryOptions;

  constructor(defaultOptions: QueryOptions = {}) {
    this.defaultOptions = defaultOptions;
  }

  /**
   * 쿼리 실행
   */
  query(
    graph: KnowledgeGraph,
    seeds: string[],
    options?: QueryOptions,
  ): QueryResult {
    return query(graph, seeds, { ...this.defaultOptions, ...options });
  }

  /**
   * 단일 경로로 관련 문서 탐색
   */
  findRelated(
    graph: KnowledgeGraph,
    path: string,
    options?: QueryOptions,
  ): QueryResult {
    return query(graph, [path], { ...this.defaultOptions, ...options });
  }
}
