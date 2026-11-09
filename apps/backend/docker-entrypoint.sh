#!/bin/sh
# Sync the DB schema, then start the server.
# No --force: a change that would lose data is refused instead of applied. drizzle-kit still
# exits 0 when it refuses (it cannot ask without a TTY), so the refusal is detected in its output.
output=$(node_modules/.bin/drizzle-kit push 2>&1)
status=$?
echo "$output"
case "$output" in
  *"Error:"*) status=1 ;;
esac
if [ "$status" -ne 0 ]; then
  echo "Schema push failed: not starting with an out-of-date database schema." >&2
  exit 1
fi
exec node dist/index.js
