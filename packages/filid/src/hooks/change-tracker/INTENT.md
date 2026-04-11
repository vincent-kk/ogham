# change-tracker -- PostToolUse 변경 추적 (disabled)

## Purpose

Write/Edit 도구 호출 직후 `ChangeQueue`에 변경 레코드를 enqueue하고 `.filid/change-log.jsonl`에 카테고리별(`fractal` / `organ` / `unknown`) 엔트리를 append한다. **`hooks.json`에서 현재 비활성화** — 각 훅 호출이 별도 프로세스에서 실행되어 큐가 persist되지 않기 때문. 영구 큐 메커니즘이 생기면 재활성화 예정이므로 dead code 표시 금지.

## Structure

- `change-tracker.ts` — `trackChange`, `classifyPathCategory` / `appendChangeLog` (internal)

## Conventions

- `tool_name`이 `'Write'`/`'Edit'`가 아니면 즉시 continue
- 카테고리 판정: 파일명이 `INTENT.md`/`DETAIL.md`이면 fractal, 아니면 조상 디렉토리를 구조 기반 `classifyNode`로 조회해 organ 발견 시 종료
- 파일시스템이 없는 경로는 `KNOWN_ORGAN_DIR_NAMES` 레거시 이름 폴백
- 로그 I/O 실패는 조용히 무시 (hook 실패로 전파 금지)
- `FILID_DEBUG=1` 환경변수 설정 시에만 `[filid:change]` additionalContext 방출

## Boundaries

### Always do

- `@deprecated` JSDoc 주석 유지 — 의도적 비활성화임을 명시
- entry stub이 no-op queue를 주입하는 상황 유지 (비활성화 상태 유지)

### Ask first

- 재활성화 (`hooks.json` 등록)
- 카테고리 집합에 `pure-function` 등 추가

### Never do

- 이 모듈을 dead code로 삭제 (복구 필요 시점 존재)
- `changeType` 값을 `'created'`/`'modified'` 외로 확장

## Dependencies

- `../../core/infra/change-queue/` (`ChangeQueue`, `ChangeRecord`)
- `../../core/tree/organ-classifier/` (`classifyNode`, `KNOWN_ORGAN_DIR_NAMES`)
- `../../types/hooks.js`, `../utils/validate-cwd.js`
- `node:fs`, `node:path`
