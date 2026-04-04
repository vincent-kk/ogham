---
created: 2026-03-28
updated: 2026-03-28
tags: [NPDP, decomposition, spec-ticket, EARS, template, PL-agenda]
layer: 4
title: Spec 티켓 포맷 정의 (v1)
expires: 2026-06-30
---
# Spec 티켓 포맷 정의 (v1)

## 설계 원칙

- spec 티켓은 **순수하게 문제 공간만 기술** — 해법 공간 정보(코드 경로, 컴포넌트명, 프레임워크) 의도적 배제
- EARS (Easy Approach to Requirements Syntax) 패턴으로 기능 정의 본문 작성
- 합류점이 아키텍처 문서 + 코드베이스를 보고 매핑하는 구조 — spec에 해법 힌트를 넣으면 문제/해법 분리 원칙 위반

## EARS 패턴 요약

| 패턴 | 템플릿 |
|---|---|
| Ubiquitous | The [system] shall [action] |
| Event-driven | **When** [trigger], the [system] shall [action] |
| State-driven | **While** [state], the [system] shall [action] |
| Unwanted | **If** [condition], **then** the [system] shall [action] |
| Optional | **Where** [feature], the [system] shall [action] |
| Complex | 위 패턴의 조합 |

## 템플릿

```markdown
## Spec

<!-- EARS 패턴으로 기능 정의. 복수 문장 가능 -->
When [trigger], the [system] shall [action].
While [state], the [system] shall [action].

## Parent
<!-- 앵커 체인: 직전 상위 티켓만 참조 -->
- parent: PROJ-42 "상위 티켓 제목"

## Domain
<!-- 문제 공간 분류. 해법(코드)이 아닌 도메인 영역 -->
- domain: [도메인명]
- category: [상위기획 | spec | 기술설계 | QA]

## I/O
<!-- 입력/출력/조건 — 종료조건 #2(명세 충분성) 충족 확인 -->
- input: ...
- output: ...
- precondition: ...
- postcondition: ...

## Acceptance Criteria
<!-- 수용 기준 — 검증 가능한 조건 -->
- [ ] ...
- [ ] ...
```

## 각 필드의 역할

| 필드 | 소비자 | 용도 |
|---|---|---|
| Spec (EARS) | 기획 파이프라인 + 합류점 | 기능 정의의 중심 |
| Parent | 기획 파이프라인 | 앵커 체인 (1단계만 참조) |
| Domain | 합류점 | 문제 공간 태그로 매핑 힌트 (코드 아님) |
| I/O | 합류점 | 매핑 판단 시 가장 유용 (뭘 받고 뭘 내보내는지) |
| Acceptance Criteria | 합류점 + QA | 테스트 연결점, 완료 판단 |

## 이슈 트래커 구현

- **트리형** (Jira Epic → Story → Subtask): 부모-자식 관계로 계보 추적
- **플랫형** (GitHub Issues + labels + links): `parent: #42` 링크로 관계 표현

어느 쪽이든 티켓이 담아야 할 정보는 동일.

## Status

v1 — 실전 적용하면서 개선 예정.

## Related
- [[04_Action/npdp/issue-decomposition/design-v2.md]]