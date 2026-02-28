---
created: 2026-02-28
updated: 2026-02-28
tags: [schedule, lazy-scheduling, session-start-hook, cron]
layer: design-area-4
---

# 11. 스케줄 메커니즘 (Lazy Scheduling)

Claude Code가 비상주 프로세스이므로 외부 크론 대신 SessionStart Hook에서 밀린 스케줄을 일괄 처리하는 방식을 채택한다.

관련 문서: [./14-plugin-architecture.md](./14-plugin-architecture.md) | [./09-agent-definition.md](./09-agent-definition.md) | [./13-autonomy-levels.md](./13-autonomy-levels.md)

---

## Lazy Scheduling 개념

세션 시작 시점에 "마지막 실행 이후 도래한 스케줄"을 일괄 감지하여 처리. 정확한 시각 보장 대신 "세션 접속 시 최대한 빨리 실행"을 보장한다.

---

## 필수 구성요소 4개

### 1. 스케줄 정의 (문서 Frontmatter)
```yaml
schedule: "매주 월요일"      # 자연어
schedule: "3일마다"          # 반복 패턴
schedule: "세션 시작마다"    # 매 세션
```

### 2. SessionStart Hook 체커
- 마지막 실행 시각 vs 현재 시각 비교
- Hook 타임아웃 3초 내에 **스케줄 체크만** 수행
- 실행 자체는 MCP 도구로 위임

### 3. 실행 큐
- 도래한 스케줄을 오래된 것 우선으로 정렬
- 동일 우선순위는 Layer 1 → Layer 2 순

### 4. 실행 기록
- 위치: `.coffaen-meta/schedule-log.json`
- 저장 내용: 마지막 실행 시각, 실행 결과, 다음 예정 시각

---

## 실행 플로우

```
1. SessionStart Hook이 schedule-log.json 읽기
        ↓
2. 지식 트리에서 schedule 필드가 있는 문서 스캔
        ↓
3. 마지막 실행 이후 도래한 스케줄 목록 생성
        ↓
4. Level에 따라 자동 실행 또는 사용자에게 제안
```

3일 이상 미접속 시: 밀린 작업 목록을 요약하여 우선순위와 함께 제안.

---

## Lazy Scheduling vs 외부 크론 비교

| 항목 | Lazy Scheduling | 외부 크론 |
|------|----------------|----------|
| 정확한 시간 보장 | 불가 (세션 의존) | 가능 |
| 플러그인 자족성 | 완전 자족 | 외부 의존 |
| 설치 복잡도 | 없음 | 별도 설정 필요 |
| 오프라인 대응 | 자동 누적 처리 | 실행 누락 |

**결정**: Lazy Scheduling 기본 채택. 외부 크론은 고급 사용자 옵션으로 문서화만 제공.
