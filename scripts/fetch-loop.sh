#!/usr/bin/env bash
cd "$(dirname "$0")/.."

while true; do
  bash scripts/fetch-hoyo.sh || true
  sleep 60
done
