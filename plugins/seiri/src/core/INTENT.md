# core — 설정과 규칙 문서

## Purpose

seiri 가 소유하는 두 상태의 구현: 프로젝트의 개입 강도 다이얼과,
`.claude/rules/` 의 배포 상태. **진실은 소유하지 않는다** — 코드가 옳은지는
저장소(테스트·CI·CLAUDE.md)가 답하고, 여기는 맥락만 다룬다.

## Structure

```
index.ts   barrel
utils/     organ — findRepoRoot · computeFileSha256 · writeAtomically
infra/     configLoader (다이얼 하나)
ruleDocs/  매니페스트 · 배포 상태 · plan/apply · 드리프트 판정
```

## Conventions

- `utils/` 는 `infra/` 와 `ruleDocs/` 의 공통 조상에 놓인 공유 헬퍼다.
  둘 중 한쪽만 쓰는 것이 생기면 그쪽으로 내린다.
- 저장소 루트는 `findRepoRoot` (fs walk-up, spawn 없음) — 훅 경로에서도 쓰이며
  세션마다 git 프로세스를 띄우지 않기 위한 선택이다.
- 파일 쓰기는 전부 `writeAtomically` 경유.
- 해시는 raw 바이트 기준 — 그래서 `.gitattributes` 가 규칙 템플릿을 LF 로
  고정하고, 루트 `.prettierignore` 가 포매터를 막는다.

## Boundaries

### Always do

- 세션 경로에서 쓰일 코드는 검증 런타임 없이 동작하게 유지.
- 사용자 파일을 건드리는 함수는 dry-run 짝을 갖게 유지.

### Ask first

- 새 상태 종류 추가 (현재 다이얼 + 배포 상태 둘뿐).
- 공개 시그니처 변경 (MCP·훅 양쪽 소비).

### Never do

- 저장소의 오라클 값(검증 명령·임계치)을 탐지·보관.
- 배포 상태를 config 에 미러링.
