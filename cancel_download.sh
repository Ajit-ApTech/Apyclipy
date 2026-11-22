#!/usr/bin/env bash
# Apyclipy Emergency / Manual Download Cancellation Script
# Usage: ./cancel_download.sh

set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ -x "$ROOT/venv/bin/python" ]]; then
    PYTHON="$ROOT/venv/bin/python"
else
    PYTHON="${APLYCLIPY_PYTHON:-python3}"
fi

exec "$PYTHON" "$ROOT/scripts/cancel_download.py" "$@"
