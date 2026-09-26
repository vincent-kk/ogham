# preToolUse — Contract

## Requirements

- standard/strict에서 기존 actor anchor와 같은 native turn의 Bash 또는 workflow 호출만 관측한다.
- Bash는 active binding이 있을 때만 기록한다. workflow는 validated explicit request만 기록한다.
- 관측은 호스트 호출 ID와 입력 해시를 저장하며 결정·주입을 하지 않는다.

## API Contracts

- processToolStart는 native PreToolUse payload를 받고 항상 비차단 무주입 결과를 반환한다.

## Acceptance Criteria

### AC-pre-provenance — Native pairing

- native ID 부재, 다른 turn, unsupported tool, off/advisory는 상태를 만들지 않는다.
- 중복 호출은 generation 변경을 이용해 재활성화할 수 없다.

## Last Updated

2026-09-26
