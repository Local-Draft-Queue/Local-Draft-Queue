#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NEXT_DIR="$ROOT_DIR/nextjs-app"
PYTHON_DIR="$ROOT_DIR/python-worker"
PYTHON_ENV_FILE="$PYTHON_DIR/.env"
PYTHON_VENV_DIR="$PYTHON_DIR/.venv"

worker_pid=""
next_pid=""

kill_port_if_busy() {
  local port="$1"
  local pids

  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return
  fi

  echo "Stopping existing process on port $port"
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    kill "$pid" >/dev/null 2>&1 || true
  done <<< "$pids"
}

stop_existing_servers() {
  kill_port_if_busy 8000
  kill_port_if_busy 3000
  kill_port_if_busy 3001
}

cleanup() {
  local exit_code=$?

  if [[ -n "$next_pid" ]] && kill -0 "$next_pid" >/dev/null 2>&1; then
    kill "$next_pid" >/dev/null 2>&1 || true
    wait "$next_pid" 2>/dev/null || true
  fi

  if [[ -n "$worker_pid" ]] && kill -0 "$worker_pid" >/dev/null 2>&1; then
    kill "$worker_pid" >/dev/null 2>&1 || true
    wait "$worker_pid" 2>/dev/null || true
  fi

  exit "$exit_code"
}

trap cleanup EXIT INT TERM

if [[ ! -f "$PYTHON_ENV_FILE" ]]; then
  echo "Missing $PYTHON_ENV_FILE"
  echo "Create the worker env file before starting the stack."
  exit 1
fi

if [[ ! -x "$PYTHON_VENV_DIR/bin/uvicorn" ]]; then
  echo "Missing Python worker dependencies in $PYTHON_VENV_DIR"
  echo "Run: cd $PYTHON_DIR && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

if [[ ! -d "$NEXT_DIR/node_modules" ]]; then
  echo "Missing Next.js dependencies in $NEXT_DIR/node_modules"
  echo "Run: cd $NEXT_DIR && npm install"
  exit 1
fi

echo "Stopping existing local servers"
stop_existing_servers

echo "Clearing stale Next.js build cache"
if [[ -d "$NEXT_DIR/.next" ]]; then
  chmod -R u+w "$NEXT_DIR/.next" 2>/dev/null || true
  find "$NEXT_DIR/.next" -mindepth 1 -exec rm -rf {} + 2>/dev/null || true
  rm -rf "$NEXT_DIR/.next" || true
fi

echo "Starting FastAPI worker on http://127.0.0.1:8000"
(
  set -a
  source "$PYTHON_ENV_FILE"
  set +a
  source "$PYTHON_VENV_DIR/bin/activate"
  cd "$PYTHON_DIR"
  exec uvicorn app.main:app --host 127.0.0.1 --port 8000
) &
worker_pid=$!

echo "Starting Next.js dev server"
(
  cd "$NEXT_DIR"
  exec npm run dev
) &
next_pid=$!

echo
echo "Stack is starting."
echo "Frontend: http://localhost:3000/dashboard"
echo "Worker:   http://127.0.0.1:8000/health"
echo "Press Ctrl+C to stop both processes."
echo

while true; do
  if ! kill -0 "$worker_pid" >/dev/null 2>&1; then
    wait "$worker_pid"
    exit $?
  fi

  if ! kill -0 "$next_pid" >/dev/null 2>&1; then
    wait "$next_pid"
    exit $?
  fi

  sleep 1
done
