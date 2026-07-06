#!/usr/bin/env bash
cd "$(dirname "$0")/.."

while true; do
  bash scripts/push-discord-widget.sh || true
  sleep 60
done
