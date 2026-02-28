---
created: 2026-02-28
updated: 2026-02-28
tags: [index, overview, navigation]
layer: meta
---

# coffaen 플러그인 설계 문서 목차

coffaen은 4-Layer 지식 모델 기반의 개인 지식공간 관리 Claude Code 플러그인이다.
이 디렉토리는 coffaen의 전체 아키텍처 설계 문서 모음이다.

관련 연구 문서:
- [연구 제안서](../Tree-Graph-Hybrid-Knowledge-Architecture-Research-Proposal/)
- [연구기획서](../연구기획서.md)

---

## 문서 목록

| # | 제목 | 한 줄 설명 | 링크 |
|---|------|-----------|------|
| 00 | 런타임 제약 분석 | Claude Code 제약 4가지 + go/no-go 게이트 | [00-runtime-constraints.md](./00-runtime-constraints.md) |
| INDEX | 전체 목차 | 읽기 순서 + 문서 갱신 규칙 | [INDEX.md](./INDEX.md) |
| 01 | 설계 원칙 | 4대 원칙 + Progressive Autonomy + 이론-구현 매핑 | [01-design-principles.md](./01-design-principles.md) |
| 02 | 4-Layer 지식 모델 | Layer 1-4 구조 + 디렉토리 설계 | 02-knowledge-layers.md |
| 03 | 트리-그래프 이중 구조 | 디렉토리 트리 + 링크 그래프 설계 | 03-tree-graph-structure.md |
| 04 | 링크 정책 | 단방향 링크 + backlink 인덱스 규칙 | 04-link-policy.md |
| 05 | Layer 1 Core Identity | 핵심 자아 디렉토리 + Hub 노드 설계 | 05-layer1-core.md |
| 06 | Layer 2-4 상세 설계 | Derived / External / Action Layer 설계 | 06-layer2-4.md |
| 07 | 그래프 탐색 알고리즘 | BFS 2-hop 확산 활성화 구현 전략 | 07-graph-traversal.md |
| 08 | MCP 도구 목록 | 지식 CRUD + 탐색 MCP 도구 명세 | 08-mcp-tools.md |
| 09 | Skill 명세 | /coffaen:setup 등 사용자 대면 스킬 | 09-skills.md |
| 10 | Agent 명세 | 기억 정리·연결·스케줄 서브에이전트 | 10-agents.md |
| 11 | Lazy Scheduling | SessionStart Hook 기반 스케줄 전략 | 11-lazy-scheduling.md |
| 12 | 온보딩 플로우 | /coffaen:setup 단계별 사용자 경험 | 12-onboarding.md |
| 13 | Progressive Autonomy | Level 0-3 자율성 정의 + 전환 조건 | 13-autonomy-levels.md |
| 14 | 플러그인 아키텍처 | Hook/MCP/Skill/Agent 계층 + ADR | [14-plugin-architecture.md](./14-plugin-architecture.md) |

---

## 권장 읽기 순서

```
Phase 0 (전제 조건 확인)
  00-runtime-constraints.md  →  01-design-principles.md

Step 1 (아키텍처 기반)
  14-plugin-architecture.md  →  02-knowledge-layers.md  →  03-tree-graph-structure.md

Step 2 (지식 구조 상세)
  04-link-policy.md  →  05-layer1-core.md  →  06-layer2-4.md

Step 3 (탐색 및 도구)
  07-graph-traversal.md  →  08-mcp-tools.md

Step 4 (사용자 인터페이스)
  09-skills.md  →  10-agents.md  →  12-onboarding.md

Step 5 (운영 정책)
  11-lazy-scheduling.md  →  13-autonomy-levels.md
```

---

## 문서 갱신 규칙

| 변경 유형 | 갱신 필요 문서 |
|----------|--------------|
| 런타임 제약 변경 | 00, 01 |
| Layer 구조 변경 | 02, 05, 06 |
| 링크 정책 변경 | 04, 07 |
| 스킬/에이전트 추가 | 08, 09, 10, 14 |
| 스케줄 정책 변경 | 11 |
| 온보딩 플로우 변경 | 12 |
| 자율성 레벨 변경 | 01, 13 |
| 플러그인 아키텍처 변경 | 14, INDEX |

문서 추가 시 이 INDEX의 문서 목록과 갱신 규칙 테이블을 함께 업데이트한다.
