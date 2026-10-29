#!/usr/bin/env bash
set -euo pipefail

if ! command -v lsof >/dev/null 2>&1; then
  echo "lsof is required but was not found in PATH."
  exit 1
fi

list_listeners() {
  lsof -nP -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null || true
}

stop_port() {
  local port="$1"
  local pids
  local remaining

  pids="$(list_listeners "$port")"
  if [[ -z "$pids" ]]; then
    echo "Port ${port}: no running listener found."
    return 0
  fi

  echo "Port ${port}: stopping listener(s) $pids"
  while IFS= read -r pid; do
    [[ -z "$pid" ]] || kill -TERM "$pid" 2>/dev/null || true
  done <<< "$pids"

  for _ in {1..5}; do
    sleep 1
    remaining="$(list_listeners "$port")"
    [[ -z "$remaining" ]] && break
  done

  remaining="$(list_listeners "$port")"
  if [[ -n "$remaining" ]]; then
    echo "Port ${port}: listener(s) did not stop; force stopping $remaining"
    while IFS= read -r pid; do
      [[ -z "$pid" ]] || kill -KILL "$pid" 2>/dev/null || true
    done <<< "$remaining"
    sleep 1
    remaining="$(list_listeners "$port")"
  fi

  if [[ -n "$remaining" ]]; then
    echo "Port ${port}: could not stop listener(s) $remaining."
    return 1
  fi

  echo "Port ${port}: stopped."
}

echo "Stopping local frontend and backend..."
failed=0
stop_port 4000 || failed=1
stop_port 5173 || failed=1

if [[ "$failed" -ne 0 ]]; then
  exit 1
fi

echo "Local services stopped."
