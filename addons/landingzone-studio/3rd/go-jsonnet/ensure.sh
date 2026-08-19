#!/usr/bin/env bash

set -euo pipefail

runtime_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
studio_dir="$(cd "$runtime_dir/../.." && pwd)"
wasm_opt="$studio_dir/node_modules/.bin/wasm-opt"

runtime_fingerprint() {
  local go_version
  go_version="$(go env GOVERSION)"
  {
    shasum -a 256 build.sh main.go go.mod go.sum
    printf '%s  %s\n' "$go_version" 'go-version'
    "$wasm_opt" --version | shasum -a 256 | sed 's/  -$/  wasm-opt-version/'
  } | shasum -a 256 | awk '{print $1}'
}

cd "$runtime_dir"

if [[ -x "$wasm_opt" && -s libjsonnet.wasm && -f .runtime-build-fingerprint ]] \
  && [[ "$(runtime_fingerprint)" == "$(<.runtime-build-fingerprint)" ]]; then
  exit 0
fi

echo "Preparing the Landing Zone Studio Jsonnet runtime..."
bash "$runtime_dir/build.sh"
