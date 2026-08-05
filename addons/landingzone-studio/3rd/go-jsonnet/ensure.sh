#!/usr/bin/env bash

set -euo pipefail

runtime_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$runtime_dir"

if shasum -a 256 -c SHA256SUMS >/dev/null 2>&1; then
  exit 0
fi

echo "Preparing the Landing Zone Studio Jsonnet runtime..."
bash "$runtime_dir/build.sh"
