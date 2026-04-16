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
- `--no-verify` 는 의도적 — pre-commit hook 이 vault 파일을 재쓰기하는 재귀 루프를 방지. Y1 정책 결정 대상 (PR β).
- `.git/index.lock` 존재 시 skip.
- execSync/execFileSync timeout 1500ms, stdio pipe.

## Last Updated

2026-04-16 (PR α — Y3 configurable skip_patterns)
