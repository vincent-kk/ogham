/**
 * @file agent-collaboration.test.ts
 * @description 3개 에이전트 협업 시퀀스 통합 테스트
 *
 * 시뮬레이션:
 * 1. identity-guardian: Layer 1 보호 (삭제/이동 차단)
 * 2. memory-organizer: Layer 2-4 문서 정리 (만료 문서 삭제, Layer 전이)
 * 3. knowledge-connector: 새 연결 문서 생성 + 검색 결과 연동
 *
 * 에이전트들은 MCP 도구를 통해 vault에 접근한다.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { handleCoffaenCreate } from '../../mcp/tools/coffaen-create.js';
import { handleCoffaenDelete } from '../../mcp/tools/coffaen-delete.js';
import { handleCoffaenMove } from '../../mcp/tools/coffaen-move.js';
import { handleCoffaenRead } from '../../mcp/tools/coffaen-read.js';
import { handleKgBuild } from '../../mcp/tools/kg-build.js';
import { handleKgSearch } from '../../mcp/tools/kg-search.js';
import type { AgentRole, AgentExecutionResult, TransitionDirective } from '../../types/agent.js';

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'coffaen-agent-'));
}

/** 에이전트 실행 결과 빌더 */
function makeAgentResult(
  role: AgentRole,
  actions: string[],
  transitions: TransitionDirective[] = [],
  error?: string,
): AgentExecutionResult {
  return {
    role,
    success: !error,
    actions,
    transitions,
    error,
    durationMs: 0,
  };
}

describe('에이전트 협업 시퀀스 통합 테스트', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();

    // 초기 vault 설정: Layer 1~4 문서들
    await handleCoffaenCreate(vault, {
      layer: 1,
      tags: ['identity', 'core'],
      content: '핵심 정체성 — 보호 대상',
      title: 'Core Identity',
      filename: 'core-identity',
    });
    await handleCoffaenCreate(vault, {
      layer: 2,
      tags: ['derived', 'knowledge'],
      content: '파생 지식 문서',
      title: 'Derived Knowledge',
      filename: 'derived-knowledge',
    });
    await handleCoffaenCreate(vault, {
      layer: 3,
      tags: ['external', 'reference'],
      content: '외부 참고 자료 — 신뢰도 높음',
      title: 'High Confidence External',
      filename: 'high-conf-ext',
      source: 'https://example.com/research',
    });
    await handleCoffaenCreate(vault, {
      layer: 4,
      tags: ['action', 'task'],
      content: '만료된 액션 아이템',
      title: 'Expired Task',
      filename: 'expired-task',
      expires: '2020-01-01',
    });
    await handleCoffaenCreate(vault, {
      layer: 4,
      tags: ['action', 'current'],
      content: '현재 진행 중인 액션',
      title: 'Active Task',
      filename: 'active-task',
      expires: '2099-12-31',
    });
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('Agent 1: identity-guardian — Layer 1 삭제 차단', async () => {
    const actions: string[] = [];
    const errors: string[] = [];

    // identity-guardian이 Layer 1 삭제 시도를 차단
    const deleteResult = await handleCoffaenDelete(vault, {
      path: '01_Core/core-identity.md',
    });

    if (!deleteResult.success) {
      errors.push(`Layer 1 삭제 차단됨: ${deleteResult.message}`);
      actions.push('Layer 1 보호 확인 완료');
    }

    const result = makeAgentResult('identity-guardian', actions);
    expect(deleteResult.success).toBe(false);
    expect(deleteResult.message).toContain('Layer 1');
    expect(errors).toHaveLength(1);
    expect(result.role).toBe('identity-guardian');
  });

  it('Agent 1: identity-guardian — Layer 1 이동 차단', async () => {
    const moveResult = await handleCoffaenMove(vault, {
      path: '01_Core/core-identity.md',
      target_layer: 2,
      reason: 'Layer 다운그레이드 시도',
    });

    expect(moveResult.success).toBe(false);
    expect(moveResult.message).toContain('Layer 1');
  });

  it('Agent 2: memory-organizer — 만료된 문서 정리', async () => {
    const actions: string[] = [];
    const today = new Date().toISOString().slice(0, 10);

    // 만료된 Layer 4 문서 삭제 — 파일 내용에서 expires 직접 파싱
    const expiredRead = await handleCoffaenRead(vault, { path: '04_Action/expired-task.md' });
    if (expiredRead.success) {
      // frontmatter에서 expires 추출
      const expiresMatch = /^expires:\s*(\d{4}-\d{2}-\d{2})/m.exec(expiredRead.content);
      const expires = expiresMatch?.[1];
      if (expires && expires < today) {
        const deleteResult = await handleCoffaenDelete(vault, {
          path: '04_Action/expired-task.md',
        });
        if (deleteResult.success) {
          actions.push(`만료 문서 삭제: 04_Action/expired-task.md`);
        }
      }
    }

    // 신뢰도 높은 Layer 3 → Layer 2 전이
    const transitions: TransitionDirective[] = [];
    const extRead = await handleCoffaenRead(vault, { path: '03_External/high-conf-ext.md' });
    if (extRead.success) {
      transitions.push({
        path: '03_External/high-conf-ext.md',
        fromLayer: 3,
        toLayer: 2,
        reason: '신뢰도가 충분히 높아 파생 지식으로 승격',
        confidence: 0.9,
        requestedAt: new Date().toISOString(),
        requestedBy: 'memory-organizer',
      });

      const moveResult = await handleCoffaenMove(vault, {
        path: '03_External/high-conf-ext.md',
        target_layer: 2,
        reason: '신뢰도 0.9 이상',
        confidence: 0.9,
      });
      if (moveResult.success) {
        actions.push(`Layer 전이: 03_External → 02_Derived`);
      }
    }

    const result = makeAgentResult('memory-organizer', actions, transitions);
    expect(result.actions).toContain('만료 문서 삭제: 04_Action/expired-task.md');
    expect(result.transitions).toHaveLength(1);
    expect(result.transitions[0].confidence).toBe(0.9);
  });

  it('Agent 3: knowledge-connector — 검색 후 연결 문서 생성', async () => {
    const actions: string[] = [];

    // 인덱스 빌드
    const buildResult = await handleKgBuild(vault, { force: true });
    expect(buildResult.success).toBe(true);
    actions.push(`인덱스 빌드: ${buildResult.nodeCount}개 노드`);

    // 지식 그래프 로드
    const { MetadataStore } = await import('../../index/metadata-store.js');
    const store = new MetadataStore(vault);
    const graph = await store.loadGraph();
    expect(graph).toBeTruthy();

    // 검색 실행
    const searchResult = await handleKgSearch(graph, {
      seed: ['knowledge', 'derived'],
      max_results: 5,
    });

    if (!('error' in searchResult)) {
      actions.push(`검색 완료: ${searchResult.results.length}개 관련 문서 발견`);

      // 검색 결과를 바탕으로 연결 문서 생성
      const connectorDoc = await handleCoffaenCreate(vault, {
        layer: 2,
        tags: ['connector', 'synthesis'],
        content: `## 지식 연결 분석

검색된 관련 문서들을 연결합니다.

관련 문서 수: ${searchResult.results.length}
검색 시드: knowledge, derived`,
        title: 'Knowledge Synthesis',
        filename: 'knowledge-synthesis',
      });

      if (connectorDoc.success) {
        actions.push(`연결 문서 생성: ${connectorDoc.path}`);
      }
    }

    const result = makeAgentResult('knowledge-connector', actions);
    expect(result.actions.length).toBeGreaterThanOrEqual(2);
    expect(result.success).toBe(true);
  });

  it('3개 에이전트 순차 협업 시퀀스', async () => {
    const executionLog: Array<{ agent: AgentRole; action: string; success: boolean }> = [];

    // === Agent 1: identity-guardian ===
    // Layer 1 보호 검증
    const deleteAttempt = await handleCoffaenDelete(vault, { path: '01_Core/core-identity.md' });
    executionLog.push({
      agent: 'identity-guardian',
      action: 'Layer 1 삭제 차단',
      success: !deleteAttempt.success, // 차단되어야 성공
    });

    // === Agent 2: memory-organizer ===
    // 만료 문서 정리
    const expiredDelete = await handleCoffaenDelete(vault, { path: '04_Action/expired-task.md' });
    executionLog.push({
      agent: 'memory-organizer',
      action: '만료 문서 삭제',
      success: expiredDelete.success,
    });

    // Layer 3 → 2 전이
    const layerMove = await handleCoffaenMove(vault, {
      path: '03_External/high-conf-ext.md',
      target_layer: 2,
      reason: '신뢰도 검증 완료',
    });
    executionLog.push({
      agent: 'memory-organizer',
      action: 'Layer 전이 (3→2)',
      success: layerMove.success,
    });

    // === Agent 3: knowledge-connector ===
    // 빌드 후 연결 문서 생성
    const build = await handleKgBuild(vault, { force: true });
    const newDoc = await handleCoffaenCreate(vault, {
      layer: 2,
      tags: ['synthesis', 'connector'],
      content: '에이전트 협업 결과물: 지식 합성 문서',
      title: 'Agent Synthesis Result',
      filename: 'agent-synthesis',
    });
    executionLog.push({
      agent: 'knowledge-connector',
      action: '연결 문서 생성',
      success: newDoc.success,
    });

    // 결과 검증
    const successfulActions = executionLog.filter((e) => e.success);
    expect(successfulActions.length).toBe(executionLog.length);

    // 에이전트별 작업 분포
    const guardianActions = executionLog.filter((e) => e.agent === 'identity-guardian');
    const organizerActions = executionLog.filter((e) => e.agent === 'memory-organizer');
    const connectorActions = executionLog.filter((e) => e.agent === 'knowledge-connector');

    expect(guardianActions).toHaveLength(1);
    expect(organizerActions).toHaveLength(2);
    expect(connectorActions).toHaveLength(1);

    expect(build.nodeCount).toBeGreaterThanOrEqual(0);
  });

  it('TransitionDirective 구조 — Layer 전이 지시어 검증', () => {
    const directive: TransitionDirective = {
      path: '03_External/research.md',
      fromLayer: 3,
      toLayer: 2,
      reason: '검증된 외부 자료를 파생 지식으로 승격',
      confidence: 0.85,
      requestedAt: new Date().toISOString(),
      requestedBy: 'memory-organizer',
    };

    expect(directive.fromLayer).toBe(3);
    expect(directive.toLayer).toBe(2);
    expect(directive.confidence).toBe(0.85);
    expect(directive.requestedBy).toBe('memory-organizer');
    expect(directive.requestedAt).toBeTruthy();
  });
});
