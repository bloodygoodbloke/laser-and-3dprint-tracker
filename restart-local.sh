#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
START_SCRIPT="$ROOT_DIR/start-local.sh"

if [[ ! -f "$START_SCRIPT" ]]; then
  echo "Could not find start-local.sh at repo root."
  exit 1
fi

if ! command -v lsof >/dev/null 2>&1; then
  echo "lsof is required but was not found in PATH."
  exit 1
fi

stop_port_if_running() {
  local port="$1"
  local pids

  pids="$(lsof -ti "tcp:${port}" || true)"
  if [[ -z "$pids" ]]; then
    echo "Port ${port}: no running process found."
    return
  fi

  echo "Port ${port}: stopping process(es) $pids"
  kill $pids 2>/dev/null || true

  sleep 1
  pids="$(lsof -ti "tcp:${port}" || true)"
  if [[ -n "$pids" ]]; then
    echo "Port ${port}: force stopping process(es) $pids"
    kill -9 $pids 2>/dev/null || true
  fi
}

echo "Stopping existing local services (if running)..."
stop_port_if_running 4000
stop_port_if_running 5173

echo ""
echo "Restarting frontend and backend..."
exec bash "$START_SCRIPT"
