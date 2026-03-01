---
created: 2026-02-28
updated: 2026-03-01
tags: [skill, context-injection, knowledge-tree, search]
layer: design-area-4
---

# 스킬 명세 — 전체 21개 스킬 통합

## 개요

사용자가 `/maencof:명령` 형태로 호출하는 확장 기능. 지식 트리 + 검색 엔진 컨텍스트를
주입하여 기억 인식 상태에서 실행된다.

관련 문서: [플러그인 아키텍처](./16-plugin-architecture.md) | [에이전트 명세](./19-agents.md) | [온보딩 플로우](./23-onboarding-flow.md)

---

## 1. 기존 지식 관리 스킬

| 스킬 | 호출 | 역할 | context_layers |
|------|------|------|----------------|
| setup | `/maencof:setup` | 초기 온보딩, Core Identity 수집 | L1 |
| remember | `/maencof:remember` | 새 지식 기록 | L2, L3, L4, L5 |
| recall | `/maencof:recall` | 지식 검색/회상 | L1, L2, L3 |
| organize | `/maencof:organize` | 기억 정리/전이 | L2, L4 |
| reflect | `/maencof:reflect` | 지식 연결/통찰 | L1, L2, L3 |

---

## 2. 검색 엔진 스킬

| 스킬 | 호출 | 역할 | Phase |
|------|------|------|-------|
| build | `/maencof:build` | 전체/증분 인덱스 구축 | 1 |
| explore | `/maencof:explore` | 대화형 SA 기반 지식 탐색 | 1 |
| diagnose | `/maencof:diagnose` | 인덱스 건강도 진단 (고아, 깨진 링크) | 1 |
| rebuild | `/maencof:rebuild` | 인덱스 강제 전체 재구축 | 1 |

---

## 3. 운영 스킬

| 스킬 | 호출 | 역할 |
|------|------|------|
| doctor | `/maencof:doctor` | 6개 진단 + 자동 수정 |
| ingest | `/maencof:ingest` | 외부 데이터 가져오기 |
| connect | `/maencof:connect` | 외부 데이터 소스 등록 |
| mcp-setup | `/maencof:mcp-setup` | 외부 MCP 서버 설치 |
| manage | `/maencof:manage` | 스킬/에이전트 활성화 관리 |

---

## 4. 환경 설정 스킬 (Configurator)

| 스킬 | 호출 | 역할 | orchestrator |
|------|------|------|-------------|
| configure | `/maencof:configure` | 통합 환경 설정 진입점 (router) | configurator |
| bridge | `/maencof:bridge` | MCP 설치+등록+워크플로우 스킬 생성 | configurator |
| craft-skill | `/maencof:craft-skill` | 커스텀 스킬 생성기 | configurator |
| craft-agent | `/maencof:craft-agent` | 커스텀 에이전트 생성기 | configurator |
| instruct | `/maencof:instruct` | CLAUDE.md 관리 | configurator |
| rule | `/maencof:rule` | 규칙 관리 | configurator |
| lifecycle | `/maencof:lifecycle` | 라이프사이클 관리 | configurator |

설정 스킬은 `context_layers: []` — 지식 Layer를 사용하지 않고 프로젝트 설정 파일만 다룸.

---

## 5. 컨텍스트 주입 시퀀스

```
1. /maencof:스킬명 호출
2. skills/스킬명/SKILL.md에서 system prompt 로드
3. context_layers 설정에 따라 문서 수집
4. SA 엔진으로 연관 문서 확산 탐색
5. 토큰 예산 내에서 컨텍스트 주입
```

---

## 6. Progressive Autonomy와 스킬 실행

| Level | 스킬 실행 방식 |
|-------|--------------|
| Level 0-1 | 모든 스킬 실행 전 승인 필요 |
| Level 2 | 자율 실행 (쓰기 동작 시 제안 후 확인) |
| Level 3 | 완전 자율 실행 |

상세: [22-autonomy-levels.md](./22-autonomy-levels.md)

---

## 7. 스킬 정의 위치

```
packages/maencof/skills/
├── setup/SKILL.md, remember/SKILL.md, recall/SKILL.md, organize/SKILL.md, reflect/SKILL.md
├── build/SKILL.md, explore/SKILL.md, diagnose/SKILL.md, rebuild/SKILL.md
├── doctor/SKILL.md, ingest/SKILL.md, connect/SKILL.md, mcp-setup/SKILL.md, manage/SKILL.md
├── configure/SKILL.md, bridge/SKILL.md, craft-skill/SKILL.md, craft-agent/SKILL.md
├── instruct/SKILL.md, rule/SKILL.md, lifecycle/SKILL.md
```

각 스킬 디렉토리에 선택적 `reference.md` 포함 가능.

사용자 정의: `.maencof-meta/custom-skills/` ([등록 및 버전 관리](./20-registry-versioning.md))
