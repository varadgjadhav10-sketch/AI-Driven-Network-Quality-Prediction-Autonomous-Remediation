#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .run/dev-pids.env ]]; then
  source .run/dev-pids.env

  for pid in "${BACKEND_PID:-}" "${FRONTEND_PID:-}" "${MOCK_PID:-}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" || true
    fi
  done

  rm -f .run/dev-pids.env
fi

docker compose down

echo "[dev-down] Local services and infra stopped."
