---
created: 2026-02-28
updated: 2026-03-01
tags: [agent, access-control, layer-restriction]
layer: design-area-4
---

# 에이전트 명세 — 서브에이전트 정의 + Layer 접근 매트릭스

## 개요

스킬보다 복잡한 다단계 자율 작업을 수행하는 서브에이전트.
지식 트리 접근 범위를 명시적으로 제한하여 안전성을 보장한다.

관련 문서: [스킬 명세](./18-skills.md) | [Progressive Autonomy](./22-autonomy-levels.md) | [플러그인 아키텍처](./16-plugin-architecture.md)

---

## 1. 에이전트 정의 위치

```
packages/maencof/agents/
├── memory-organizer.md
├── knowledge-connector.md   # 미구현 (향후 추가 예정)
├── schedule-runner.md       # 폐기됨
├── identity-guardian.md
├── doctor.md
└── configurator.md
```

Frontmatter에 `allowed_layers`, `allowed_operations` 명시.
등록 메커니즘: [등록 및 버전 관리](./20-registry-versioning.md)

---

## 2. 에이전트-Layer 접근 매트릭스

| 에이전트 | L1 | L2 | L3 | L4 | L5 | 쓰기 범위 |
|---------|----|----|----|----|-----|----------|
| memory-organizer | 읽기 | 읽기/쓰기 | 읽기/쓰기 | 읽기/쓰기 | 읽기/쓰기 | 전이/정리 |
| knowledge-connector | 읽기 | 읽기 | 읽기 | 읽기 | 읽기 | 링크 생성만 (미구현) |
| schedule-runner | - | - | - | - | - | 폐기됨 |
| identity-guardian | 읽기 | 읽기 | 읽기 | 읽기 | 읽기 | 읽기 전용 (L1 보호/갱신 안내) |
| doctor | 읽기 | 읽기 | 읽기 | 읽기 | 읽기 | 진단 + Frontmatter 자동수정 (maencof_update) |
| configurator | - | - | - | - | - | 프로젝트 설정 파일만 (MCP 관할 외) |

---

## 3. 접근 방식 — 2-Track 원칙

에이전트 유형에 따라 접근 방식이 다르다:

### 지식 그래프 에이전트 (memory-organizer, identity-guardian, doctor)

지식 문서 조작은 **MCP 도구 경유 원칙**. 직접 파일 시스템 접근 금지.
단, 진단/탐색 목적의 Read/Glob/Grep은 예외 허용.

```
에이전트 → MCP 도구 호출 → 접근 제어 검증 → 지식 트리 조작
```

Frontmatter 예시:
```yaml
allowed_layers: [2, 3, 4]
allowed_operations: [read, create, update]
forbidden_operations: [delete, bulk-modify]
```

### 인프라 에이전트 (configurator)

MCP 관할 밖 설정 파일을 **직접 도구(Read, Write, Edit, Glob, Grep, Bash)**로 관리.
Never Modify 목록으로 범위를 엄격히 제한한다.

- **Managed Scope**: `.claude/`, `.mcp.json`, `CLAUDE.md`, `.maencof-meta/`
- **Never Modify**: `settings.local.json`, `~/.claude/settings.json`, `packages/maencof/`
- **참여 스킬**: configure, bridge, craft-skill, craft-agent, instruct, rule, lifecycle
- **사용 도구**: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion

```
configurator → 직접 파일 접근 → Never Modify 목록 검증 → 설정 파일 조작
```

---

## 4. Autonomy Level별 에이전트 실행

| Level | 실행 방식 |
|-------|---------|
| Level 0-1 | 모든 에이전트 실행 전 승인 필요 |
| Level 2 | doctor 자율. 나머지 승인 |
| Level 3 | 파괴적 작업(대량 삭제/구조 변경)만 승인. 나머지 자율 |

긴급 잠금 시 Level 0 복귀. 상세: [22-autonomy-levels.md](./22-autonomy-levels.md)
