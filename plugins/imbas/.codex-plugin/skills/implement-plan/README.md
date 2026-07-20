# implement-plan

Story와 cross-story Task를 병렬 배치로 묶어 명시적 실행 순서를 산출하는
DAG 기반 구현 일정 생성 스킬. 예: `[S1,S2,S5] -> [T1,S3] -> [S4,S6,S7]`

## 개요

1. `stories-manifest.json`을 로드한다 (선택적으로 `devplan-manifest.json` 병합).
2. 의존성 DAG를 구성한다:
   - `StoryLink` — `blocks` 및 역방향 어휘(`is blocked by` / `blocked-by`)
   - `TaskItem.blocks` — cross-story Task가 가리키는 Story/Task
3. Kahn 알고리즘으로 topological level을 부여하고, 순환은 결정적으로 해소한다.
4. 각 level을 그룹으로 분할한다 (`--max-parallel`로 상한 지정 가능).
5. 저장:
   - `.imbas/<KEY>/runs/<run-id>/implement-plan.json`
   - `.imbas/<KEY>/runs/<run-id>/implement-plan-report.md`

## 사용 예

```bash
# Phase 3.5 이후 표준 사용
/imbas:implement-plan

# 특정 런 대상 + 병렬 상한 지정
/imbas:implement-plan --run 20260418-001 --max-parallel 3

# devplan 이전의 stories 전용 모드 (정밀도 저하)
/imbas:implement-plan --source stories
```

## 소스별 정밀도

| Source    | 사용 신호                                       | 정밀도          |
| --------- | ----------------------------------------------- | --------------- |
| `stories` | StoryLink blocks / 역방향 어휘                  | 낮음 — degraded |
| `devplan` | StoryLink + Task.blocks + cross-story Task 추출 | 높음            |

기본값은 `devplan`.

## 제한 사항

- Subtask는 스케줄링하지 않는다 (상위 Story에 귀속).
- `issue_ref`가 없는 티켓도 스케줄에 포함된다; 이슈 생성 후 재실행하면
  리포트에 전체 참조가 채워진다.
