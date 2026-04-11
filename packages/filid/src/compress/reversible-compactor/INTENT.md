# reversible-compactor -- 가역 참조 기반 파일 압축

## Purpose

파일 내용을 `[REF]`/`[EXPORTS]`/`[LINES]` 3줄 참조 블록으로 치환한다. 원본 파일은 디스크에 그대로 남아 있어 복원 가능(참조만 저장). 컨텍스트 윈도우에는 경로·심볼 목록만 로드하고, 실제 내용은 필요 시 재읽기한다.

## Structure

- `reversible-compactor.ts` — `compactReversible`, `restoreFromCompacted`, `CompactInput` / `CompactResult` / `RestoredReference` 인터페이스

## Conventions

- 압축 포맷 (정확히 3줄):
  ```
  [REF] <filePath>
  [EXPORTS] <comma-joined | (none)>
  [LINES] <lineCount>
  ```
- `compactedLines` 상수: 항상 3
- `originalLines`는 빈 문자열 짧은 회로 + `split('\n')` 후 비어있지 않은 줄만 카운트
- `(none)` 토큰은 "exports 없음"의 예약 문자열 — 이름 중복 금지
- `restoreFromCompacted`는 메타만 파싱 — 실제 내용은 호출자가 `fs.readFile`로 재획득
- `CompressionMeta.method === 'reversible'`, `recoverable: true` 고정

## Boundaries

### Always do

- 압축 포맷 변경 시 `compactReversible`과 `restoreFromCompacted` 파서를 동시 갱신
- 빈 content 입력에도 유효한 참조 블록 반환 (`originalLines=0`)

### Ask first

- 메타 라인 추가 (`[HASH]`, `[MTIME]` 등)
- `compactReversible`에 실제 파일 I/O 도입 (현재는 input.content 주입 필수)

### Never do

- 원본 content를 `compacted` 문자열에 끼워 넣기 (참조만 허용)
- `(none)` 예약 토큰을 export 이름으로 사용

## Dependencies

- `../../types/documents.js` (`CompressionMeta`)
