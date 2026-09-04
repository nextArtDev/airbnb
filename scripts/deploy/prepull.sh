#!/usr/bin/env bash
# Retry-loop pre-pull of base images (survives flaky DNS/network)
i=0
while [ "$i" -lt 40 ]; do
  if docker pull -q oven/bun:1.3; then
    echo "bun image OK"
    if docker pull -q postgres:16-alpine; then
      echo "PULL-ALL-OK"
      exit 0
    fi
  fi
  i=$((i + 1))
  sleep 5
done
echo "PULL-FAILED"
exit 1
