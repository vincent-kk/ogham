# injectDynamic -- UserPromptSubmit 라이브 상태 주입

## Purpose

매 사용자 프롬프트의 세션 카운터와 구성에 따라 라이브 상태를 최대 3줄로 주입한다. 매 턴 토큰 점유를 줄이기 위해 모든 provider가 비활성이면 설정 안내 한 줄만 출력하고, 그 외 세션 식별 불가 상태에서는 payload를 생략한다. 카운터 파일 부재·식별자 불일치를 실제 0회와 구분하며 counter는 read-only다.

## Conventions

- provider가 활성이고 세션이 식별되면 기본 2줄, 자동 지목 대상 키워드가 매치될 때만 3줄로 제한한다. 새 정보는 줄을 늘리지 말고 압축한다
- 자동 지목은 `electableProviders` 결과만 대상 — self host·`crosscheck_only` 제외
- ASCII 키워드는 단어 경계, 비-ASCII 포함 키워드는 부분 문자열 (한국어 조사 흡수)

## Boundaries

### Always do

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
