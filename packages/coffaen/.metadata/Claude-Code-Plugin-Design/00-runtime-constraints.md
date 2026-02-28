---
created: 2026-02-28
updated: 2026-02-28
tags: [runtime, constraints, go-no-go, claude-code]
layer: meta
---

# Phase 0 — Claude Code 런타임 제약 분석 및 go/no-go 게이트

## 목적

coffaen 설계의 시작점. 이론적으로 원하는 기능이 Claude Code 런타임에서 실현 가능한지
사전에 판별하여, 이후 모든 설계 결정의 근거로 삼는다.

관련 문서: [설계 원칙](./01-design-principles.md) | [플러그인 아키텍처](./16-plugin-architecture.md) | [한계와 제약](./26-constraints-and-limitations.md)

---

## 1. Claude Code 런타임 제약 4가지

| # | 제약 | 내용 |
|---|------|------|
| C1 | **Hook 타임아웃** | PreToolUse/PostToolUse/SessionStart 훅은 3-5초 내 완료 필수 |
| C2 | **세션 간 상태 불가** | 메모리·변수는 세션 종료 시 소멸. 영속 정보는 파일 시스템에만 저장 |
| C3 | **MCP 단일 요청-응답** | 각 MCP 호출은 독립적인 요청-응답 사이클. 스트리밍·구독 불가 |
| C4 | **비상주 런타임** | 플러그인은 사용자가 Claude Code를 열 때만 실행. 백그라운드 불가 |

---

## 2. go/no-go 게이트 테이블

| 설계 영역 | 이론 원형 | go/no-go | 실현 가능 범위 | fallback |
|----------|----------|----------|--------------|----------|
| 확산 활성화 | 그래프 전체 전파 | CONSTRAINED | SA 엔진 (configurable 홉) | 1-hop 축소 |
| 기억 전이 | 자동 실시간 전이 | CONSTRAINED | SessionStart Hook 지연 전이 | 수동 스킬 호출 |
| 벡터 검색 | 임베딩 DB | NO-GO (기본) | 태그+Frontmatter 검색 | Phase 3 선택적 확장 |
| 자율 스케줄 | 크론 자동 실행 | CONSTRAINED | Lazy Scheduling | 수동 트리거 |
| 실시간 모니터링 | 상시 감시 | NO-GO | 세션 시작 시 점검 | 사후 감지만 |

- **GO**: 제약 없이 구현 가능
- **CONSTRAINED**: 제약 범위 내에서 부분 구현 가능
- **NO-GO**: 기본 구현에서 배제, 선택적 확장으로만 허용

확산 활성화 홉 수 분석 상세: [확산 활성화](./10-spreading-activation.md) 참조.

---

## 3. 운영 환경 제약

| 제약 | 영향 범위 | 완화 전략 |
|------|----------|----------|
| Hook 타임아웃 3-5초 | 인덱스 빌드 불가, 검색만 | Skill로 빌드 위임 |
| 번들 크기 제한 | 네이티브 바인딩 추가 어려움 | 순수 JS 알고리즘 우선 |
| 네트워크 접근 보안 | LLM API 호출 제한적 | Phase 2까지 LLM-free |

---

## 4. 기억 전이 파일 시스템 동작 범위

**가능한 동작**
- SessionStart Hook 시 파일 시스템 스캔 및 인덱스 갱신
- 파일 기반 Frontmatter 메타데이터 읽기/쓰기
- backlink 인덱스 및 .coffaen/ 캐시 갱신

**불가한 동작**
- 세션 종료 후 자동 전이, 실시간 파일 감시, 크론 기반 주기적 전이
