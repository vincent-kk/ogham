#!/usr/bin/env bash

set -euo pipefail

usage() {
  printf 'usage: %s <subject:v71|v7|v6|v5|ocr> <pass> <run:a|b|c|d|f|g|h>\n' "${0##*/}" >&2
  exit 2
}

fail() {
  printf 'run-skill: %s\n' "$1" >&2
  exit 1
}

[[ $# -eq 3 ]] || usage
: "${SCRATCH:?SCRATCH must be the absolute validation scratch root}"

SUBJECT=$1
PASS=$2
RUN=$3
[[ "$SUBJECT" =~ ^(v71|v7|v6|v5|ocr)$ ]] || fail "invalid subject: $SUBJECT"
[[ "$PASS" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || fail "invalid pass: $PASS"
[[ "$RUN" =~ ^(a|b|c|d|f|g|h)$ ]] || fail "invalid run: $RUN"
[[ "$SCRATCH" == /* ]] || fail 'SCRATCH must be absolute'

HARNESS_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
PROJECT_ROOT=$(cd -- "$HARNESS_DIR/../../../.." && pwd -P)
REPO="$SCRATCH/calib/$PASS/$RUN"
RESULT_DIR="$SCRATCH/results/$SUBJECT/$PASS/$RUN"

[[ -d "$REPO/.git" ]] || fail "materialized repository not found: $REPO"
git -C "$REPO" switch -q "calib/$RUN"

case "$SUBJECT" in
  v71)
    PLUGIN_DIR="${V71_PLUGIN_DIR:-$SCRATCH/worktrees/v71/plugins/filid}"
    PROMPT='/filid:cross-review --base main'
    ;;
  v7)
    PLUGIN_DIR="$SCRATCH/worktrees/v7/plugins/filid"
    PROMPT='/filid:cross-review --base main'
    ;;
  v6)
    PLUGIN_DIR="$SCRATCH/worktrees/v6/plugins/filid"
    PROMPT='/filid:cross-review --base main'
    ;;
  v5)
    PLUGIN_DIR="$SCRATCH/worktrees/v5/plugins/filid"
    PROMPT='/filid:cross-review --base main'
    ;;
  ocr)
    PLUGIN_DIR='/Users/Vincent/Workspace/open-code-review/plugins/open-code-review/claude-code'
    PROMPT='/open-code-review:delegate-review --from main --to HEAD'
    [[ -x "$SCRATCH/bin/ocr" ]] || fail "ocr binary not found: $SCRATCH/bin/ocr"
    ;;
esac
[[ -d "$PLUGIN_DIR" ]] || fail "plugin directory not found: $PLUGIN_DIR"

mkdir -p -- "$RESULT_DIR"
if [[ -f "$RESULT_DIR/session.json" || -f "$RESULT_DIR/session.stream.jsonl" || -d "$RESULT_DIR/artifacts" ]]; then
  ATTEMPT=1
  while [[ -e "$RESULT_DIR/reruns/attempt-$ATTEMPT" ]]; do
    ATTEMPT=$((ATTEMPT + 1))
  done
  ARCHIVE_DIR="$RESULT_DIR/reruns/attempt-$ATTEMPT"
  mkdir -p -- "$ARCHIVE_DIR"
  for NAME in session.stream.jsonl session.json session.stderr artifacts; do
    if [[ -e "$RESULT_DIR/$NAME" ]]; then
      mv -- "$RESULT_DIR/$NAME" "$ARCHIVE_DIR/$NAME"
    fi
  done
fi

STREAM_TMP="$RESULT_DIR/.session.stream.jsonl.tmp"
SESSION_TMP="$RESULT_DIR/.session.json.tmp"
STDERR_TMP="$RESULT_DIR/.session.stderr.tmp"
rm -f -- "$STREAM_TMP" "$SESSION_TMP" "$STDERR_TMP"

set +e
if [[ "$SUBJECT" == ocr ]]; then
  (
    cd -- "$REPO"
    PATH="$SCRATCH/bin:$PATH" claude \
      --model "${CLAUDE_VALIDATION_MODEL:-sonnet}" \
      --effort "${CLAUDE_VALIDATION_EFFORT:-medium}" \
      --plugin-dir "$PLUGIN_DIR" \
      -p "$PROMPT" \
      --permission-mode bypassPermissions \
      --output-format stream-json \
      --verbose \
      --max-turns 60
  ) > "$STREAM_TMP" 2> "$STDERR_TMP"
else
  (
    cd -- "$REPO"
    claude \
      --model "${CLAUDE_VALIDATION_MODEL:-sonnet}" \
      --effort "${CLAUDE_VALIDATION_EFFORT:-medium}" \
      --plugin-dir "$PLUGIN_DIR" \
      -p "$PROMPT" \
      --permission-mode bypassPermissions \
      --output-format stream-json \
      --verbose \
      --max-turns 60
  ) > "$STREAM_TMP" 2> "$STDERR_TMP"
fi
CLAUDE_STATUS=$?
set -e

mv -- "$STREAM_TMP" "$RESULT_DIR/session.stream.jsonl"
mv -- "$STDERR_TMP" "$RESULT_DIR/session.stderr"
[[ "$CLAUDE_STATUS" -eq 0 ]] ||
  fail "claude exited $CLAUDE_STATUS; see $RESULT_DIR/session.stderr"

node - "$RESULT_DIR/session.stream.jsonl" "$SESSION_TMP" <<'NODE'
const fs = require('node:fs');

const streamPath = process.argv[2];
const outputPath = process.argv[3];
// A skill that spawns actor sessions emits one top-level result event per
// segment; turns, duration and usage are per-segment while cost is cumulative.
const resultEvents = [];
for (const [index, line] of fs.readFileSync(streamPath, 'utf8').split(/\r?\n/).entries()) {
  if (!line.trim()) continue;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    throw new Error(`invalid stream JSON at line ${index + 1}`);
  }
  if (event.type === 'result') resultEvents.push(event);
}
if (!resultEvents.length) throw new Error('session stream missing final result event');
const resultEvent = resultEvents[resultEvents.length - 1];
const total = (pick) => resultEvents.reduce((sum, event) => sum + (pick(event) ?? 0), 0);
const stat = fs.statSync(streamPath);

const session = {
  result: resultEvent.result,
  result_segments: resultEvents.length,
  num_turns: total((event) => event.num_turns),
  duration_ms: total((event) => event.duration_ms),
  wall_clock_ms: Math.round(stat.mtimeMs - stat.birthtimeMs),
  total_cost_usd: Math.max(...resultEvents.map((event) => event.total_cost_usd ?? 0)),
  usage: {
    input_tokens: total((event) => event.usage?.input_tokens),
    output_tokens: total((event) => event.usage?.output_tokens),
  },
};
const required = [
  ['result', session.result],
  ['num_turns', session.num_turns],
  ['duration_ms', session.duration_ms],
  ['total_cost_usd', session.total_cost_usd],
  ['usage.input_tokens', session.usage?.input_tokens],
  ['usage.output_tokens', session.usage?.output_tokens],
];
const missing = required.filter(([, value]) => value === undefined).map(([key]) => key);
if (missing.length) throw new Error(`session JSON missing: ${missing.join(', ')}`);
fs.writeFileSync(outputPath, `${JSON.stringify(session)}\n`, 'utf8');
NODE
mv -- "$SESSION_TMP" "$RESULT_DIR/session.json"

ARTIFACTS_DIR="$RESULT_DIR/artifacts"
mkdir -p -- "$ARTIFACTS_DIR"

if [[ "$SUBJECT" == ocr ]]; then
  node - "$RESULT_DIR/session.json" "$ARTIFACTS_DIR/ocr-result.md" <<'NODE'
const fs = require('node:fs');

const session = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const result = typeof session.result === 'string'
  ? session.result
  : JSON.stringify(session.result, null, 2);
fs.writeFileSync(process.argv[3], `${result}\n`, 'utf8');
NODE
else
  REVIEW_ROOT="$REPO/.filid/review"
  REVIEW_DIRS=()
  if [[ -d "$REVIEW_ROOT" ]]; then
    while IFS= read -r -d '' DIRECTORY; do
      REVIEW_DIRS+=("$DIRECTORY")
    done < <(find "$REVIEW_ROOT" -mindepth 1 -maxdepth 1 -type d -print0)
  fi
  [[ "${#REVIEW_DIRS[@]}" -eq 1 ]] ||
    fail "expected one review directory, found ${#REVIEW_DIRS[@]}"
  cp -R -- "${REVIEW_DIRS[0]}/." "$ARTIFACTS_DIR/"
fi

printf 'session=%s transcript=%s artifacts=%s\n' \
  "$RESULT_DIR/session.json" "$RESULT_DIR/session.stream.jsonl" "$ARTIFACTS_DIR"
