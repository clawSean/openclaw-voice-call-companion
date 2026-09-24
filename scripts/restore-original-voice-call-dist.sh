#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
official_root="$(node "$project_root/scripts/resolve-trusted-voice-call-root.mjs")"
official_dist="$official_root/dist"
rollback_dist="$official_root/dist.pre-task-call"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
failed_dist="$official_root/dist.failed-task-call-$timestamp"

test -d "$official_dist"
test -d "$rollback_dist"
test ! -e "$failed_dist"

mv "$official_dist" "$failed_dist"
mv "$rollback_dist" "$official_dist"

printf 'Restored original Voice Call dist\n'
printf 'Preserved failed build: %s\n' "$failed_dist"
