#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found in PATH."
  exit 1
fi

if [[ ! -d "$BACKEND_DIR" || ! -d "$FRONTEND_DIR" ]]; then
  echo "Expected backend and frontend folders at repo root."
  exit 1
fi

install_if_needed() {
  local service_dir="$1"
  if [[ ! -d "$service_dir/node_modules" ]]; then
    echo "Installing dependencies in $service_dir..."
    (cd "$service_dir" && npm install)
  fi
}

cleanup() {
  local exit_code=$?
  echo ""
  echo "Stopping local services..."

  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi

  wait 2>/dev/null || true
  exit "$exit_code"
}

trap cleanup INT TERM EXIT

install_if_needed "$BACKEND_DIR"
install_if_needed "$FRONTEND_DIR"

echo "Starting backend on http://127.0.0.1:4000 ..."
(
  cd "$BACKEND_DIR"
  npm run dev
) &
BACKEND_PID=$!

echo "Starting frontend on http://127.0.0.1:5173 ..."
(
  cd "$FRONTEND_DIR"
  npm run dev -- --host 127.0.0.1 --port 5173
) &
FRONTEND_PID=$!

echo ""
echo "App is starting."
echo "Frontend: http://127.0.0.1:5173"
echo "Backend health: http://127.0.0.1:4000/api/health"
echo ""
echo "Press Ctrl+C to stop both services."

wait "$BACKEND_PID" "$FRONTEND_PID"
