# cross-review 벤치마크 하네스

`calibration.md`의 fixture를 scratch 저장소로 materialize하고, cross-review(또는 비교 대상 ocr)를 `claude -p`로 실행해 세션 스트림·비용·산출물을 보존하는 도구다.

| 파일                                          | 역할                                                                                                                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `materialize.sh <pass> <run>`                 | `$SCRATCH/calib/<pass>/<run>`에 fixture 저장소를 만든다(base `main` + `calib/<run>` branch).                                                                                                              |
| `run-skill.sh <subject> <pass> <run>`         | fixture 저장소에서 스킬을 1회 실행하고 `$SCRATCH/results/<subject>/<pass>/<run>/{session.json,session.stream.jsonl,session.stderr,artifacts/}`를 남긴다. 같은 결과 디렉터리가 있으면 `reruns/`로 보관한다 |
| `measure-session.mjs <results-dir> [run ...]` | pass 하나의 run별 비용·벽시계·오케스트레이터/액터 API 호출·낭비 호출·액터 소스 읽기·verdict를 출력한다                                                                                                    |
| `rubric.md`                                   | 5항목 0–3점 채점 루브릭                                                                                                                                                                                   |

## 환경 변수

```sh
export SCRATCH=<쓰기 가능한 scratch 루트>      # calib/, results/, worktrees/, bin/ 이 아래에 생긴다
export CLAUDE_VALIDATION_MODEL=sonnet          # claude -p --model
export CLAUDE_VALIDATION_EFFORT=medium         # claude -p --effort
unset CLAUDE_PLUGIN_ROOT                       # 남아 있으면 review-rule-map-missing 으로 실패한다
```

subject별 플러그인 위치: `v71`은 `V71_PLUGIN_DIR`(기본 `$SCRATCH/worktrees/v71/plugins/filid`) — 작업 트리를 직접 가리키면 커밋 없이 측정할 수 있다. `v7`·`v6`·`v5`는 `$SCRATCH/worktrees/<subject>/plugins/filid`(detached worktree, bridge 포함 커밋이어야 한다). `ocr`은 스크립트 안의 절대 경로와 `$SCRATCH/bin/ocr` 바이너리를 쓴다.

## 실행

```sh
H=.metadata/filid/cross-review-calibration/harness
bash $H/materialize.sh r5 a && bash $H/materialize.sh r5 h
bash $H/run-skill.sh v71 r5 a
bash $H/run-skill.sh v71 r5 h
node $H/measure-session.mjs "$SCRATCH/results/v71/r5"
```

한 pass 안에서 같은 run을 다시 돌리지 않는다. 결과가 이상하면 새 pass 번호로 다시 측정하고 두 결과를 모두 보고한다.

## 측정 규약

- 비용은 `session.json`의 `total_cost_usd`(세션 누적값). 벽시계는 `wall_clock_ms`(스트림 파일의 생성·수정 시각 차). 세그먼트별 `duration_ms` 합은 조율 시간을 놓치므로 쓰지 않는다.
- API 호출 수는 스트림의 `assistant` 이벤트를 `request_id`로 중복 제거해 센다. `parent_tool_use_id`가 없으면 오케스트레이터, 있으면 액터(배경 Agent)다. `usage.input_tokens`는 캐시 읽기를 빼고 나오므로 입력량 지표로 쓰지 않는다.
- 낭비 호출: 오케스트레이터의 `ScheduleWakeup`, `find /` Bash, brief·`reviewers/*.md`·`templates.md` Read. 액터 소스 읽기: `/src/` 아래 Read, 따옴표 밖 구간에서 `cat`류로 `src/`를 여는 Bash.
- 한 실행의 결과는 표집 변동 안에 있다. 재현 스크립트 실행(±5 호출), 오탐으로 인한 round 2·verify 추가(±2 액터)가 $0.1–0.3를 움직이므로, 그 크기의 효과는 a·h 단발 측정으로 판별할 수 없다.
