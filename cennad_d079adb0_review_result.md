# Cennad `d079adb0` 리뷰 결과

- 대상 커밋: `d079adb0d959ae570f9cde914f1877dd7b7222fc`
- 비교 기준: `c28ca67b083d6a58aa4dc429066acf14fe01aaac`
- 커밋 제목: `feat(cennad): introduce apex tier and liveness timeout enhancements`
- 변경 규모: 92개 파일, 2,137 additions, 346 deletions
- 검토일: 2026-07-28
- 최종 판정: **REQUEST_CHANGES**

## 요약

이 커밋에는 실제 수정이 필요한 문제가 있다. 다만
[`claude_cennad_review.md`](./claude_cennad_review.md)의 15개 지적을 모두 같은
의미의 운영 버그로 보기는 어렵다.

가장 심각한 문제는 다음 두 가지다.

1. 설정 UI에서 Antigravity effort의 대소문자 표현이 어긋나 `High`, `Medium`,
   `Low`가 모두 `low`로 내려간다.
2. Antigravity transcript 복구가 이번 턴이 아닌 이전 턴의 완료 응답을 새 성공
   응답처럼 반환할 수 있다.

그 밖에 Windows r-statistics timeout 회귀, 실행 불가능한 legacy agy 호환 계약,
legacy session reference 승격 누락, 유효하지 않은 idle-reset 테스트가 차단
수준으로 확인됐다. 별도 구조 검사에서는 `parseCodexStream`의 cyclomatic
complexity가 19로 저장소 임계값 15를 초과했다.

반면 stderr가 idle timer를 재설정하는 동작과 스킬이 tier를 직접 고르는 동작은
현재 문서화된 정책 또는 제품 결정이다. Codex abort/idle race에 관한 12번
시나리오는 현재 실행 순서에서는 성립하지 않는다.

## 문제 상황

이 커밋은 다음 변경을 한꺼번에 수행한다.

- `apex` tier 추가와 provider별 model/effort mapping 확장
- Claude·Antigravity의 stream-json 전환
- 기존 10분 wall-clock timeout을 idle timeout + tier hard cap으로 교체
- 공용 `spawnCli`의 Windows timeout 의미 변경
- Antigravity conversation ID와 transcript fallback 추가
- 설정 UI와 세 provider skill의 tier 계약 변경

개별 기능보다 경계에서 문제가 집중됐다.

- UI label과 저장 model 간 정규화 불일치
- CLI exit code와 structured result 간 상태 불일치
- dispatcher 결과와 session store 간 reference 전파 누락
- cennad 요구사항을 위해 바꾼 shared helper가 r-statistics에 미친 영향
- 실제 구버전 CLI가 아닌 permissive fake를 사용한 호환성 테스트

## 15개 주장 판정

`CONFIRMED`는 해당 코드 동작이 재현됐거나 소스에서 결정적으로 성립한다는
뜻이다. 이것만으로 외부 CLI가 운영 환경에서 항상 해당 입력을 낸다는 뜻은
아니다.

| #   | 판정                | 심각도 | 판단                                                                                                                                                                               |
| --- | ------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CONFIRMED           | LOW    | `positiveMs(0.5)`가 0이 되고 schema 실패 후 설정 전체가 default로 돌아간다. UI는 정수 분을 저장하므로 주된 trigger는 수동 fractional-ms 편집이다.                                  |
| 2   | PLAUSIBLE           | LOW    | `spawnCli`가 장시간 stdout/stderr를 무제한 문자열로 누적한다. 위험은 실제지만 운영 출력량 증거가 없어 RangeError 발생 빈도는 확정할 수 없다.                                       |
| 3   | CONFIRMED           | HIGH   | slug parser는 `high/medium/low`, scale은 `High/Medium/Low`를 사용해 정상 effort가 모두 `low`로 clamp된다.                                                                          |
| 4   | CONFIRMED mechanism | LOW    | 선행 non-JSON banner 뒤의 유효 JSONL을 raw success로 오인한다. 지원 agy가 banner를 stdout에 출력하는지는 확인되지 않았다.                                                          |
| 5   | PLAUSIBLE           | LOW    | Codex가 `turn.failed`와 exit 0을 함께 내면 success가 새어 나간다. 현재 관측된 usage-limit 실행은 exit 1이라 실제 현재 장애로는 확인되지 않았다.                                    |
| 6   | PLAUSIBLE           | LOW    | Claude nonzero-exit 경로가 structured stdout을 파싱하지 않아 오류 사유를 잃을 수 있다. 실제 Claude의 channel/exit 조합은 provider 호출 없이 확인하지 않았다.                       |
| 7   | CONFIRMED           | LOW    | `spawnError`에서 오류 코드를 정하면서 message는 부수적인 stderr를 우선해 서로 모순된 진단을 만든다.                                                                                |
| 8   | CONFIRMED           | MEDIUM | 60초 이상 Windows ×3 제거가 r-statistics의 120–600초 timeout에도 적용돼 기존 effective allowance를 1/3로 줄인다.                                                                   |
| 9   | INTENTIONAL POLICY  | —      | 모든 stdout/stderr chunk가 idle을 재설정하는 것은 `spawn` 계약에 명시된 정책이다. noisy CLI hardening 문제이지 현재 계약 위반은 아니다.                                            |
| 10  | PRODUCT DECISION    | —      | provider skill이 항상 tier를 고르므로 일반 skill start에서 `default_tier`가 사용되지 않는다. 직접 MCP 경로에는 남아 있으며 task-aware routing을 택한 의도적 계약 변경이다.         |
| 11  | CONFIRMED           | HIGH   | transcript 전체 mtime만 확인한 뒤 이전 DONE 응답을 선택하므로, 현재 실패/빈 턴이 이전 답변을 새 success로 돌려줄 수 있다.                                                          |
| 12  | REFUTED as asserted | —      | stderr handler가 retry detector보다 먼저 idle timer를 재설정하므로 주장된 일반 Codex retry-storm race는 성립하지 않는다. 외부 abort가 만료 직전에 오는 좁은 generic race만 남는다. |
| 13  | CONFIRMED           | MEDIUM | start/resume이 modern flags를 항상 보내므로 해당 flags를 모르는 구버전 agy는 legacy parser에 도달하기 전에 종료한다.                                                               |
| 14  | CONFIRMED           | MEDIUM | POSIX에서는 child startup이 500ms 예산을 소비해 flaky하고, Windows에서는 5초로 확장돼 heartbeat reset 없이도 통과할 수 있다.                                                       |
| 15  | CONFIRMED           | MEDIUM | resume 결과의 새 conversation ID를 dispatcher와 persistence 양쪽에서 버려 cwd-backed session이 stable ID로 승격되지 않는다.                                                        |

## 차단 수정 항목

### 1. AGY effort 정규화

경로:
`plugins/cennad/src/mcp/pages/settings/scripts/app.js`

slug, display name, 저장 값이 동일한 canonical case를 사용하도록 정규화하고,
각 variant의 설정 UI round-trip 테스트를 추가해야 한다.

### 2. Transcript 복구를 현재 턴으로 제한

경로:
`plugins/cennad/src/dispatcher/antigravity/utils/agyTranscriptStore.ts`

실행 전 byte offset 또는 turn marker 이후의 DONE 응답만 허용해야 한다. 이전
DONE 뒤에 현재 실패 턴이 추가되는 회귀 테스트가 필요하다.

### 3. Shared timeout 정책 분리

경로:
`shared/cross-platform/src/spawn/osTimeout.ts`

cennad의 고정 hard ceiling과 Windows process-startup allowance를 별도
정책/옵션으로 분리하고, r-statistics의 장시간 Windows timeout 계약을
테스트해야 한다.

### 4. Legacy agy 지원 정책 명확화

경로:
`plugins/cennad/src/dispatcher/antigravity/utils/buildStartArgs.ts`

다음 중 하나를 선택해야 한다.

- version/capability에 따라 modern flags를 선택적으로 전송한다.
- 최소 지원 agy 버전을 강제하고 legacy fallback 약속을 제거한다.

legacy fake는 modern flags를 받아들이지 않도록 바꿔 실제 구버전 동작을
모델링해야 한다.

### 5. Conversation ID 승격·저장

경로:
`plugins/cennad/src/dispatcher/antigravity/operations/antigravityDispatcher.ts`,
`plugins/cennad/src/mcp/tools/continueConversation/continueConversation.ts`

resume이 새 `conversationId`를 받으면 `result.externalSessionRef`에 반영하고
session store에도 저장해야 한다.

### 6. `parseCodexStream` 복잡도 축소

경로:
`plugins/cennad/src/dispatcher/codex/jsonlParser/jsonlParser.ts`

현재 함수 CC는 19다. event 해석, terminal 상태 선택, 결과 정규화를 이름 있는
단계나 dispatch table로 분리해 임계값 15 이하로 낮춰야 한다.

`spawnCli.ts`의 파일 합산 CC 39는 차단 항목에서 제외했다. 저장소 규칙은 개별
함수에 적용되며 해당 파일의 최대 함수 CC는 14이므로 file aggregate 적용은
규칙 오해다.

### 7. Idle-reset 테스트를 load-bearing하게 수정

경로:
`shared/cross-platform/src/spawn/__tests__/spawnCli.test.ts`

child-ready 신호 뒤에 측정을 시작하고 timeout scaling을 주입하거나 fake
clock을 사용해야 한다. heartbeat reset을 제거하면 모든 플랫폼 조건에서
테스트가 실패하는지도 확인해야 한다.

## 서로 다른 관점

### 릴리스·정확성

effort 축소와 stale transcript는 사용자가 선택하지 않은 품질로 실행하거나
틀린 답을 성공으로 전달한다. 수정 전에는 출시를 승인하기 어렵다.

### 제품

`default_tier`를 사용자 설정이 소유할지, skill rubric이 작업마다 선택할지는
제품 결정이다. 현재 UI는 전자를 암시하고 skill은 후자를 수행하므로 한쪽을
명시적으로 정본으로 정해야 한다.

### 운영 안정성

무제한 output 누적은 발생 빈도가 확인되지 않았지만 저빈도·고영향 위험이다.
긴 hard cap을 유지하려면 bounded tail buffer 또는 크기 제한과 truncation
표시가 필요하다.

### 호환성

구버전 agy 지원이 필요하지 않다면 복잡한 capability fallback을 추가하기보다
최소 지원 버전을 선언하고 죽은 fallback을 제거하는 편이 더 명확하다.

### 테스트·개발 속도

전체 테스트가 녹색이어도 permissive fake와 non-load-bearing timeout test는
실제 계약을 증명하지 못한다. 전체 커밋을 되돌리기보다 위 7개 항목을 국소
수정하고 낮은 우선순위 hardening을 후속 작업으로 분리하는 편이 적절하다.

## 검증 결과

- 최종 `yarn test:run`
  - Test Files: 582 passed, 3 skipped
  - Tests: 5,029 passed, 20 skipped
- 집중 `spawnCli` suite: 16 passed
- 변경으로 새로 생긴 fractal boundary 또는 dependency cycle: 발견되지 않음
- 변경 INTENT.md: 모두 50줄 이하·3-tier boundary 포함
- LCOM4: 실패 없음
- 관련 소스는 대상 커밋 이후 현재 HEAD까지 변경되지 않음

전체 테스트 통과는 위 문제를 반증하지 않는다. 이번 문제의 상당수는 현재
테스트가 모델링하지 않은 provider contract, 플랫폼 차이, 턴 단위 상태
전파에서 발생한다.

## 권장 순서

1. 즉시: 3번 effort 축소, 11번 stale transcript
2. 다음: 8번 shared timeout, 13번 legacy 정책, 15번 session reference
3. 검증 gate: 14번 idle test, `parseCodexStream` complexity
4. 후속 hardening: 1, 2, 4, 5, 6, 7
5. 제품 결정: 9, 10

**Review verdict: REQUEST_CHANGES**
