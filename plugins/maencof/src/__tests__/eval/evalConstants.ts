/**
 * @file evalConstants.ts
 * @description 평가 러너 고정 파라미터 — 라이브 MCP 경로와 동일 조건 측정을 보장한다.
 */
import type { QueryOptions } from '../../search/queryEngine/index.js';

export const K = 10;

/** kg_search 기본 파라미터 고정 (라이브 MCP 경로 동일 조건) */
export const LIVE_DEFAULTS: QueryOptions = {
  maxResults: K,
  decay: 0.7,
  threshold: 0.1,
  maxHops: 5,
};

/** kg_context 기본 토큰 예산 (라이브 MCP 경로 동일 조건) */
export const CONTEXT_TOKEN_BUDGET = 2000;
