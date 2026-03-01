---
created: 2026-02-28
updated: 2026-02-28
tags: [schedule, lazy-scheduling, session-start-hook, index-build]
layer: design-area-5
---

# Lazy Scheduling — SessionStart Hook 기반 + 인덱스 빌드 통합

## 개요

Claude Code가 비상주 프로세스이므로 SessionStart Hook에서 밀린 스케줄을
일괄 처리하는 방식을 채택한다. 인덱스 빌드 스케줄도 통합 관리한다.

관련 문서: [플러그인 아키텍처](./16-plugin-architecture.md) | [에이전트 명세](./19-agents.md) | [메타데이터 전략](./12-metadata-strategy.md)

---

## 1. Lazy Scheduling 개념

세션 시작 시점에 "마지막 실행 이후 도래한 스케줄"을 일괄 감지.
정확한 시각 대신 "세션 접속 시 최대한 빨리 실행"을 보장한다.

---

## 2. 통합 스케줄 큐

### 기억 관리 스케줄 (기존)
- Frontmatter `schedule` 필드 기반 (예: "매주 월요일", "3일마다")
- 기억 전이 후보 점검, 만료 문서 정리

### 인덱스 빌드 스케줄 (신규 통합)
- `.maencof/stale-nodes.json` 비율 기반
- stale 노드 10% 초과 → 증분 재인덱싱 자동 제안
- stale 노드 30% 초과 → 전체 재빌드 권장

---

## 3. 실행 플로우

```
1. SessionStart Hook: schedule-log.json 읽기
2. 기억 스케줄 스캔 (Frontmatter schedule 필드)
3. 인덱스 스케줄 스캔 (stale-nodes.json 비율)
4. 도래 스케줄 목록 생성 (오래된 것 우선, Layer 1 → 2 순)
5. Level에 따라 자동 실행 또는 사용자에게 제안
```

3일 이상 미접속 시: 밀린 작업 요약 + 우선순위와 함께 제안.

---

## 4. 실행 기록

위치: `.maencof-meta/schedule-log.json`

| 필드 | 내용 |
|------|------|
| last_run | 마지막 실행 시각 |
| result | 성공/실패/건너뜀 |
| next_due | 다음 예정 시각 |
| index_stale_ratio | 마지막 점검 stale 비율 |

---

## 5. Lazy Scheduling vs 외부 크론

| 항목 | Lazy Scheduling | 외부 크론 |
|------|----------------|----------|
| 시간 보장 | 불가 (세션 의존) | 가능 |
| 자족성 | 완전 자족 | 외부 의존 |
| 설치 복잡도 | 없음 | 별도 설정 |

결정: Lazy Scheduling 기본. 외부 크론은 고급 사용자 옵션.
