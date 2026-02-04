#!/bin/bash
# ══════════════════════════════════════════════════════════
# pull-sandbox-images.sh
# Run this ONCE before starting the platform to pre-pull
# the Docker images used for sandboxed code execution.
# ══════════════════════════════════════════════════════════

echo "🔽 Pulling sandbox Docker images..."
echo ""

echo "  [1/3] gcc:12-alpine (for C compilation)"
docker pull gcc:12-alpine

echo ""
echo "  [2/3] openjdk:17-alpine (for Java compilation & execution)"
docker pull openjdk:17-alpine

echo ""
echo "  [3/3] python:3.11-alpine (for Python execution)"
docker pull python:3.11-alpine

echo ""
echo "✅ All sandbox images pulled successfully."
echo "   You can now start the platform with: docker-compose up -d"
