---
created: 2026-02-28
updated: 2026-02-28
tags: [architecture, plugin, hook, mcp, skill, agent, adr]
layer: meta
---

# 플러그인 아키텍처 — Hook/MCP/Skill/Agent 계층 + ADR

## 개요

coffaen 플러그인은 4개 계층(Hook, MCP 도구, Skill, Agent)으로 구성된다.
각 계층은 명확히 분리된 역할을 가지며, 런타임 제약([00-runtime-constraints.md](./00-runtime-constraints.md)) 내에서 동작한다.

관련 문서: [설계 원칙](./01-design-principles.md)

---

## 1. coffaen 플러그인 4계층 역할

### Hook — 세션 경계 감지 + 무결성 가드

- **SessionStart**: 지식 트리 무결성 점검, backlink 인덱스 갱신, Lazy Scheduling 실행
- **PreToolUse**: 위험한 파일 삭제/이동 시 경고 (Layer 1 문서 보호)
- **PostToolUse**: 새 파일 생성 감지 → Layer 배치 제안
- 제약: 타임아웃 3-5초, 차단보다 제안/안내 위주

### MCP 도구 — 지식 그래프 핵심 기능

- 지식 트리 CRUD (문서 생성, 읽기, 이동, 삭제)
- 링크 관리 (단방향 링크 생성, backlink 인덱스 갱신)
- 기억 전이 (Layer 간 문서 이동 + 메타데이터 갱신)
- 그래프 탐색 (BFS 2-hop 확산 활성화)
- 각 도구는 단일 요청-응답 사이클 내에서 완결

### Skill — 사용자 대면 명령

- `/coffaen:setup`: 온보딩, 4-Layer 디렉토리 초기화
- `/coffaen:remember`: 현재 컨텍스트를 지식 트리에 저장
- `/coffaen:recall`: 키워드 기반 지식 탐색 + 확산 활성화
- `/coffaen:reflect`: 기억 전이 제안 및 실행
- `/coffaen:status`: 지식 트리 현황 요약
- 상세 명세: [09-skills.md](./09-skills.md)

### Agent — 특화 서브에이전트

- **기억 정리 에이전트**: Action Layer 휘발 문서 정리, 승격 제안
- **지식 연결 에이전트**: 고아 문서 탐지, 링크 제안
- **스케줄 에이전트**: Lazy Scheduling 실행, 전이 큐 관리
- 상세 명세: [10-agents.md](./10-agents.md)

---

## 2. 4-Layer 지식 모델 ↔ 플러그인 계층 매핑

| Layer | 역할 | 주요 플러그인 계층 |
|-------|------|------------------|
| Layer 1 Core | 핵심 자아, Hub 노드, trust-level.json | Hook(보호), MCP(읽기 중심) |
| Layer 2 Derived | 내재화 지식, 다중 연결 | MCP(CRUD), Agent(연결) |
| Layer 3 External | 외부 참조, 단방향, Leaf | MCP(읽기), Skill(임포트) |
| Layer 4 Action | 작업 기억, 휘발성 | Hook(감지), Agent(정리/승격) |

---

## 3. filid와의 차별화

| 관점 | filid | coffaen |
|------|-------|---------|
| 목적 | 코드 품질 규칙 강제 | 개인 지식공간 성장 지원 |
| 접근 방식 | 규범적 (위반 차단) | 적응적 (성장 제안) |
| Hook 역할 | 위반 감지 + 차단 | 이벤트 감지 + 안내 |
| MCP 중심 | AST 분석, 규칙 검사 | 그래프 탐색, 기억 전이 |
| 사용자 관계 | 규칙 준수 요구 | 신뢰 기반 협력 |

---

## 4. ADR #1 — 왜 filid와 다른 아키텍처를 채택하는가

**결정**
coffaen은 사용자의 개인 지식공간을 관리하는 반자율 에이전트로 설계한다.
filid의 규칙 강제 아키텍처를 재사용하지 않고 독립적인 계층 구조를 채택한다.

**근거**
- filid는 코드 품질 규칙을 강제하는 규범적 시스템이다. Hook은 위반을 차단하고, MCP는 AST 분석에 집중한다.
- coffaen은 사용자의 지식 성장을 지원하는 적응적 시스템이다. 차단보다 제안이 핵심이며, MCP는 그래프 탐색이 중심이다.
- 두 플러그인의 목적이 근본적으로 다르므로, 아키텍처를 공유하면 양쪽 모두에서 불필요한 복잡성이 발생한다.

**결과**
- Hook은 차단(PreToolUse 거부) 대신 안내 메시지와 제안을 기본 동작으로 한다.
- MCP 도구 설계는 그래프 탐색(BFS, backlink)과 Layer 간 전이를 우선한다.
- Progressive Autonomy Level에 따라 Hook과 Agent의 개입 강도가 달라진다.
- filid와 coffaen은 동일 모노레포에 공존하되, 내부 구현을 공유하지 않는다.
