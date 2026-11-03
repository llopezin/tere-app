#!/usr/bin/env bash
# Stop hook: before Claude ends a turn, run lint, the repo's own tests and the e2e suite.
# Exit 2 + stderr blocks the stop and feeds the failure back to Claude so it fixes it.
set -uo pipefail

MAX_BLOCKS=3 # consecutive failed attempts before letting Claude stop (avoids infinite loops)

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0
input=$(cat)
session_id=$(jq -r '.session_id // "default"' <<<"$input")

state_dir="$(git rev-parse --git-dir)/claude-verify"
mkdir -p "$state_dir"
passed_file="$state_dir/last-passed"
blocks_file="$state_dir/blocks-$session_id"
log_dir="$state_dir/logs"

# Fingerprint of the working tree (HEAD + tracked diff + untracked files).
# If nothing changed since the last green run (e.g. a Q&A turn), skip the checks.
fingerprint=$(
  {
    git rev-parse HEAD
    git diff HEAD
    git ls-files --others --exclude-standard | xargs -I{} sh -c 'echo "{}"; cat "{}"' 2>/dev/null
  } | shasum | cut -d' ' -f1
)
if [[ -f "$passed_file" && "$(cat "$passed_file")" == "$fingerprint" ]]; then
  rm -f "$blocks_file"
  exit 0
fi

# All worktrees share the same test database: serialize runs with a lock in the common git dir
lock_dir="$(git rev-parse --path-format=absolute --git-common-dir)/claude-verify.lock"
until mkdir "$lock_dir" 2>/dev/null; do
  # Recover from a lock left behind by a killed run
  if [[ -n $(find "$lock_dir" -maxdepth 0 -mmin +30 2>/dev/null) ]]; then rm -rf "$lock_dir"; fi
  sleep 5
done
trap 'rm -rf "$lock_dir"' EXIT

rm -rf "$log_dir" && mkdir -p "$log_dir"
failed=()
run_check() {
  local name=$1
  shift
  if ! "$@" >"$log_dir/$name.log" 2>&1; then
    failed+=("$name")
  fi
}

run_check "lint" pnpm -r --if-present lint
run_check "tests" pnpm -r --if-present test
run_check "e2e" pnpm run --if-present test:e2e

if [[ ${#failed[@]} -eq 0 ]]; then
  echo "$fingerprint" >"$passed_file"
  rm -f "$blocks_file"
  exit 0
fi

blocks=$(($(cat "$blocks_file" 2>/dev/null || echo 0) + 1))
echo "$blocks" >"$blocks_file"

if ((blocks > MAX_BLOCKS)); then
  rm -f "$blocks_file"
  echo "Verification still failing (${failed[*]}) after $MAX_BLOCKS attempts; allowing stop. Tell the user the task is NOT verified. Logs: $log_dir" >&2
  exit 0
fi

{
  echo "Cannot finish yet: pre-completion checks failed (${failed[*]}). Attempt $blocks/$MAX_BLOCKS."
  echo "Fix the failures (or, if they need something outside your control such as the test DB not running, tell the user) before declaring the task complete."
  for name in "${failed[@]}"; do
    echo "--- $name (last 60 lines, full log: $log_dir/$name.log) ---"
    tail -n 60 "$log_dir/$name.log"
  done
} >&2
exit 2
