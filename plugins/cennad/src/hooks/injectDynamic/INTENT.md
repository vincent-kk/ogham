# injectDynamic -- UserPromptSubmit 라이브 상태 주입

## Purpose

매 사용자 프롬프트마다 stdin의 prompt, 세션 카운터 저장소, 구성 저장소를 읽어 **2–3줄**을 출력한다: 호출 카운트 + 점유율 미달 provider 한 줄, 강도별 nudge 한 줄, 키워드가 매치된 턴에만 소유자 지목 한 줄. 매 턴 주입이므로 토큰 점유 최소화가 이 훅의 제1 제약이다. 카운터 파일 부재, 세션 식별 불가, 식별자 불일치를 실제 0회와 구분하며 counter 는 read-only다.

## Conventions

- 출력은 매치 없으면 2줄, 매치되면 3줄. 새 정보는 줄을 늘리지 말고 압축한다
- 자동 지목은 `electableProviders` 결과만 대상 — self host·`crosscheck_only` 제외
- ASCII 키워드는 단어 경계, 비-ASCII 포함 키워드는 부분 문자열 (한국어 조사 흡수)
- 식별된 현재 세션의 호출이 실제 0건이면 `[cennad] No delegations yet this session.` (점유율 조각 생략)
- provider 전부 disabled → `[cennad] No provider enabled — run /cennad:setup.`
- electable 0개 → nudge 대신 crosscheck-only 안내 한 줄

## Boundaries

### Always do

- 출력 envelope: `{ continue: true, hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext } }`
- counter 파일은 read-only
- stdin 실패 시 빈 문자열로 진행 — 프롬프트를 못 읽어도 주입은 계속된다

### Ask first

- counter 스키마 확장
- nudge / matchLine 문구 변경 (매 턴 토큰 비용)
- stdin 타임아웃 상향 (훅 예산 3초)

### Never do

- counter / config 파일에 write
- `additionalContext` 에 cwd · session ID · 프롬프트 원문 누설 (매치 키워드만)
- 키워드로 정규식 생성 (`c++` 등 메타문자가 그대로 들어온다)
