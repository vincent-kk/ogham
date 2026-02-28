---
created: 2026-02-28
updated: 2026-02-28
tags: [architecture, plugin, hook, mcp, skill, agent, state-sharing]
layer: meta
---

# 플러그인 아키텍처 — Hook/MCP/Skill/Agent 계층 + 상태 공유

## 개요

coffaen은 4개 계층(Hook, MCP 도구, Skill, Agent)으로 구성된다.
각 계층은 [런타임 제약](./00-runtime-constraints.md) 내에서 동작한다.

관련 문서: [설계 원칙](./01-design-principles.md) | [MCP 도구 명세](./17-mcp-tools.md) | [스킬 명세](./18-skills.md)

---

## 1. 4계층 역할

### Hook — 세션 경계 감지 + 무결성 가드
- SessionStart: 지식 트리 점검, 인덱스 로드, WAL 복구, Lazy Scheduling
- PreToolUse: Layer 1 문서 보호 경고
- PostToolUse: 파일 변경 시 인덱스 무효화 (stale-nodes.json)

### MCP 도구 — 지식 그래프 핵심 기능
- CRUD 5개 + 검색 5개 통합 도구 명세 ([MCP 도구](./17-mcp-tools.md))

### Skill — 사용자 대면 명령
- 기존 5스킬 + 검색 4스킬 통합 ([스킬](./18-skills.md))

### Agent — 특화 서브에이전트
- 기억 정리, 지식 연결, 스케줄, 정체성 수호 ([에이전트](./19-agents.md))

---

## 2. 상태 공유 전략

Hook, MCP, Skill이 동일 인덱스에 접근하므로 상태 공유 규약 필요:

| 구분 | 접근 방식 | 제어 |
|------|----------|------|
| 읽기 (MCP, Hook) | 항상 허용 | 메모리 로드 스냅샷 |
| 쓰기 (Skill/CLI) | 배타적 | `.coffaen/.lock` 파일 |
| 무효화 (Hook) | append-only | `.coffaen/stale-nodes.json` |

---

## 3. 4-Layer ↔ 플러그인 계층 매핑

| Layer | 역할 | 주요 플러그인 계층 |
|-------|------|------------------|
| Layer 1 Core | Hub 노드, trust-level | Hook(보호), MCP(읽기) |
| Layer 2 Derived | 내재화, Dense cluster | MCP(CRUD), Agent(연결) |
| Layer 3 External | 외부 참조, Leaf | MCP(읽기), Skill(임포트) |
| Layer 4 Action | 작업 기억, Volatile | Hook(감지), Agent(정리) |

---

## 4. ADR — filid와의 차별화

| 관점 | filid | coffaen |
|------|-------|---------|
| 목적 | 코드 품질 규칙 강제 | 개인 지식공간 성장 지원 |
| Hook 역할 | 위반 감지 + 차단 | 이벤트 감지 + 안내 |
| MCP 중심 | AST 분석 | 그래프 탐색, 기억 전이 |
