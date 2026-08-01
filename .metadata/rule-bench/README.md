# rule-bench — 규칙 효능 판정 하네스

seiri·filid 규칙 문서의 행동 효능을 측정하는 재사용 가능한 벤치마크. 효능 A/B·D9(`.metadata/seiri/phase0/`)의 방법론 — shown 과제 + hidden 오라클, fenced subagent proxy, 무개입 프롬프트 — 을 계승하되, 이번에는 픽스처·채점기·암(arm)을 전부 커밋해 재실행 가능하게 만든다(D9의 픽스처 유실 재발 방지).

## 구성

```
issues/<id>/fixture/     이슈별 pristine 스크래치 저장소 (Node, 무의존, node --test)
issues/<id>/task.md      shown 과제 본문 — 규칙·측정을 언급하지 않는다(무개입)
issues/<id>/hidden/      hidden 오라클 테스트 — 실행 디렉터리에 배치되지 않고 채점 시에만 주입
issues/<id>/selftest/    naive/(관례 무시 해법) · correct/(관례 존중 해법) — 오라클 판별력 검증용
issues/<id>/meta.json    shownTests · protectedFiles · hiddenTotal · special 플래그
arms/R1/                 현행 규칙 14종 사본 · arms/R2/  압축 후보 14종
prepare.mjs              실행 디렉터리 생성 + 프롬프트 조립
grade.mjs                채점(+ --selftest 판별력 검증)
apply-rules-sync.mjs     채택 시 templates → .claude/rules + AGENTS.md 마커 동기화
results/                 측정 결과 정본
```

## 실행 규약

1. `node prepare.mjs --issue iA --arm R1 --rep 1 --out <scratchpad>` → `{runDir, prompt}` JSON 출력. 암 규칙은 `<runDir>/.claude/rules/`에 배치된다(R0은 없음).
2. 피험자 서브에이전트(model: haiku)에 `prompt`를 그대로 전달. 세션 히스토리·규칙 명은 싣지 않는다.
3. 피험자의 최종 보고문을 `<runDir>/FINAL.md`로 저장(iE의 false-done 판정 입력).
4. `node grade.mjs <runDir> --log <results.jsonl>` → `{issue, arm, rep, shownPassed, shownTotal, hiddenPassed, hiddenTotal, finalMention?}` 1행. 채점은 protected 테스트를 pristine으로 복원한 뒤 hidden을 주입해 `node --test` 종료코드·TAP 집계로만 판정한다 — 에이전트 자기보고는 점수에 넣지 않는다.
5. `node grade.mjs --selftest` — 전 이슈에 대해 base(shown 실패)·naive(shown 통과·hidden 미달)·correct(전부 통과)를 확인한다. 하나라도 어긋나면 그 오라클은 판별력이 없다.

## 판정 스키마

- shown: 과제 완수(보이는 실패 테스트의 통과 여부). hidden: 관례 존중(다중 assert, 부분 점수 = 통과/전체).
- 특례 `fail-first`(iF): 에이전트가 추가한 테스트를 pristine 소스에 적용해 **실패해야**(pre-fix red) 하고, 수정본에서 통과해야 한다. assert 3개(존재·prefix-red·fixed-green).
- 특례 `finalMention`(iE): FINAL.md가 무관 기존 실패(report)를 언급했는지 — hidden 점수 밖의 보조 지표.

## 한계 (해석 시 유의)

- 단일샷 계기: 프로세스 규칙(S3·S6·S7·S8)의 장기세션·컴팩션 체제 가치는 여기서 재지 못한다(`phase0/SYNTHESIS.md`). R0 고통과를 프로세스 조항 삭제 근거로 쓰지 않는다.
- 피험자는 이 세션의 Agent 서브에이전트다. 주변 컨텍스트는 세 암에 공통 상수로 통제되지만 0은 아니다.
- 규칙 파일 채널만 측정한다. 훅 주입 채널은 범위 밖.
