# vault-committer — DETAIL

## Requirements

- SessionEnd 또는 UserPromptSubmit 이벤트에서 opt-in 설정 (`.maencof-meta/vault-commit.json::enabled=true`) 이 있을 때만 vault 변경사항(`.maencof/`, `.maencof-meta/`) 을 자동 커밋한다.
- UserPromptSubmit 은 사용자의 프롬프트가 설정된 `skip_patterns` (Y3) 중 하나와 매칭될 때만 트리거된다. 미설정 시 기본 패턴은 `/clear` (v0.2.x 호환).
- 어떠한 경로에서도 세션 종료 / 프롬프트 처리를 블록하지 않는다. 항상 `{ continue: true }` 반환.

## API Contracts

### Config schema (`.maencof-meta/vault-commit.json`)

```jsonc
{
  "enabled": true,
  "skip_patterns": [
    "^\\s*/clear\\s*$",
    "^\\s*/resetthing\\s*$"
  ]
}
```

- `enabled` (필수, boolean): true 가 아니면 훅은 즉시 반환.
- `skip_patterns` (선택, string[]): regex source 배열. case-insensitive 매칭. 유효하지 않은 regex 는 silently 무시.
- 필드 부재/빈 배열 → `DEFAULT_SKIP_PATTERN_SOURCE` (`^\\s*/clear\\s*$`) 1개로 fallback.

### Functions

- `readVaultCommitConfig(cwd)` — config 파싱. 타입 체크 통과 시 `VaultCommitConfig`, 아니면 `null`.
- `shouldCommitOnPrompt(prompt, config)` — config 기반 패턴 매칭. UserPromptSubmit 게이트에서 사용.
- `isClearCommand(prompt)` — 후방 호환 helper. `/clear` 매칭 전용.
- `runVaultCommitter(input, event?)` — main handler. event 가 `UserPromptSubmit` 일 때만 prompt gate 동작.

### Commit behavior

- `git add .maencof/` 와 `git add .maencof-meta/` 를 개별 실행 (경로 없음 시 에러 무시).
- `git commit --no-verify -m "chore(maencof): <timestamp>_session_wrap"` 으로 커밋.
- `.git/index.lock` 존재 시 skip.
- execSync/execFileSync timeout 1500ms, stdio pipe.

## Policy — `--no-verify` rationale (Y1 Option A, 승인 완료 2026-04-16)

repo 소유자는 2026-04-16 자 Y1 정책 결정에서 **Option A — Keep `--no-verify`**
를 승인했다. 이 결정은 user-level global CLAUDE.md 의 "Never skip hooks"
기본 원칙에 대한 명시적 예외이며, 다음 근거에 기반한다:

1. **재귀 루프 방지.** 사용자의 pre-commit hook 이 vault 파일(`.maencof/`,
   `.maencof-meta/`) 자체를 쓰거나 읽는 경우, vault-committer 가 pre-commit
   을 실행시키면 그 hook 이 또다시 vault 를 수정해 무한 루프로 발전할 수
   있다. `--no-verify` 는 이 경로의 재귀를 끊는다.
2. **자동 커밋 의미 유지.** SessionEnd / `/clear` 트리거는 사용자가 손을 대지
   않은 상태에서 발생한다. pre-commit 이 대화형 입력을 요구하면 세션 종료
   자체가 블록될 수 있어 hook-as-background-job 보장이 깨진다.
3. **opt-in 전용.** 기능 자체가 `.maencof-meta/vault-commit.json::enabled=true`
   에 의해서만 활성화되므로, 예외가 사용자 전체 리포지토리로 번지지 않는다.

이 결정을 되돌리려면 (a) vault 파일을 쓰지 않는 pre-commit 환경을 보장하고,
(b) loop-detector (사용자 hook 이 vault 를 수정했는지 detect → 재귀 중단)
를 새로 구현한 뒤 본 훅에서 `--no-verify` 를 제거해야 한다. 해당 작업은
v0.4.0 후속 follow-up 항목으로 추적된다.

## Last Updated

2026-04-16 (PR α follow-up — Y1 Option A rationale 승인 완료)
