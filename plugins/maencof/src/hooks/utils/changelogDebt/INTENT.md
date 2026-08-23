# changelogDebt

## Purpose

MCP bootSweep 관심사. host configuration registry에서 파생한 감시 경로의 미기록 git 변경을 부팅당 1회 스캔해 `changelogState` 의 `pending` 에 기록한다. SessionStart 가 pending 을 1줄 권고로 표면화하고, `/maencof:changelog` 가 큐레이션 후 비운다. 감지를 세션 경계(부팅)에 두는 이유: 매 턴 git spawn 을 피한다.

## Boundaries

### Always do

- `git status --porcelain -z` 사용 (NUL 구분 — 비ASCII/특수문자 경로 인용 없음, rename 은 원본 토큰 skip)
- changelog 디렉터리 자체(CHANGELOG_EXCLUDE) 변경은 제외
- 실패 시 graceful degradation (`{ continue: true }` + errorLog) — git 미설치/비저장소 vault 에서 조용히 비활성

### Ask first

- host configuration registry의 감시 surface 변경 (생성 reference와 소비자를 함께 검증)
- 차단/강제 로직 재도입

### Never do

- 세션 종료 차단 (`continue: false`)
- 배럴(index.js) import (훅 번들 비대)
