# projectSnapshot — 프로젝트 증거 snapshot

## Purpose

등록 adapter의 tree, dependency, entry surface, verification과 legacy migration 증거를 한 시점의 언어 중립 snapshot으로 조립한다.

## Structure

- `projectSnapshot.ts` — snapshot orchestration entry
- `snapshotHash/` — 정렬된 relative path와 file content hash organ
- `evidence/` — 문서, entry surface, dependency와 legacy ledger 증거 수집 organ
- entry point는 `index.ts`; 구현은 `projectSnapshot.ts`다.

## Conventions

- tradeoff 우선순위: 1. 증거 보존 2. 결정론 3. 처리량
- config는 adapter 선택과 output language 입력이며 자동 저장하지 않는다.

## Boundaries

### Always do

- adapter unsupported/ambiguity와 unresolved dependency를 diagnostic으로 보존
- 확정 ownership만 tree evidence에 쓰고 adapter detect/discovery를 반복하지 않음
- validation max depth와 무관하게 snapshot tree를 완전 탐색
- snapshot hash를 file content와 구조 입력에서만 계산
- tree, graph, verification, document와 legacy ledger evidence를 같은 실행에서 조립
- legacy ledger를 root DETAIL migration target과 함께 보존하고 content를 hash

### Ask first

- `ProjectSnapshot` 공개 필드 또는 hash schema 변경
- snapshot 생성 중 filesystem 재시도 정책 변경

### Never do

- mtime을 snapshot 의미에 포함
- 생태계 확장자·entry 이름·import 문법 해석
- legacy ledger 삭제 또는 자동 변환
- 프로젝트 파일 수정

## Dependencies

- `../../adapters/`, `../tree/`, `../verification/`, `../analysis/dependencyGraph/`
