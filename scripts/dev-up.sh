#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WITH_MOCK=false
SKIP_INSTALL=false

for arg in "$@"; do
  case "$arg" in
    --with-mock) WITH_MOCK=true ;;
    --skip-install) SKIP_INSTALL=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

cd "$ROOT_DIR"
mkdir -p .run logs

echo "[dev-up] Repo root: $ROOT_DIR"
echo "[dev-up] Starting infra containers..."
docker compose up -d kafka kafka-setup redis postgres clickhouse

if [[ ! -d .venv ]]; then
  echo "[dev-up] Creating virtual environment..."
  python3 -m venv .venv
fi

if [[ "$SKIP_INSTALL" == false ]]; then
  echo "[dev-up] Installing backend dependencies..."
  .venv/bin/python -m pip install --upgrade pip
  .venv/bin/python -m pip install -r backend/requirements.txt
  .venv/bin/python -m pip install torch==2.2.0

  echo "[dev-up] Installing frontend dependencies..."
  npm --prefix frontend install
fi

if [[ ! -f ml_pipeline/weights/br_lstm.pth || ! -f ml_pipeline/weights/detector.pth ]]; then
  echo "[dev-up] Model weights missing. Training models once..."
  .venv/bin/python ml_pipeline/scripts/train_all.py
fi

echo "[dev-up] Starting backend..."
nohup .venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload > logs/backend.log 2>&1 &
BACK_PID=$!

echo "[dev-up] Starting frontend..."
nohup bash -lc "cd frontend && npm run dev" > logs/frontend.log 2>&1 &
FRONT_PID=$!

MOCK_PID=""
if [[ "$WITH_MOCK" == true ]]; then
  echo "[dev-up] Starting mock traffic producer..."
  nohup .venv/bin/python mock_traffic_producer.py > logs/mock.log 2>&1 &
  MOCK_PID=$!
fi

{
  echo "BACKEND_PID=$BACK_PID"
  echo "FRONTEND_PID=$FRONT_PID"
  echo "MOCK_PID=$MOCK_PID"
} > .run/dev-pids.env

echo "[dev-up] Done."
echo "[dev-up] UI:  http://localhost:5173"
echo "[dev-up] API: http://localhost:8000/health"
echo "[dev-up] Logs: logs/backend.log, logs/frontend.log"
