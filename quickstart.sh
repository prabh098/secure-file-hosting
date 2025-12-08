#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/backend"
[ -f .env ] || cp .env.example .env
npm install
echo "Starting backend..."
npm run dev
