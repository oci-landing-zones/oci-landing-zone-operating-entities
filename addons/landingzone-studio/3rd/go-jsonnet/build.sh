#!/usr/bin/env bash

set -euo pipefail

runtime_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
studio_dir="$(cd "$runtime_dir/../.." && pwd)"
wasm_opt="$studio_dir/node_modules/.bin/wasm-opt"
expected_go="go1.25.4"
export GOCACHE="${GOCACHE:-$studio_dir/node_modules/.cache/go-build}"
mkdir -p "$GOCACHE"

if [[ "$(go env GOVERSION)" != "$expected_go" ]]; then
  echo "go-jsonnet WASM requires $expected_go; got $(go env GOVERSION)" >&2
  exit 1
fi

if [[ ! -x "$wasm_opt" ]]; then
  echo "wasm-opt not found; run npm install in $studio_dir" >&2
  exit 1
fi

unoptimized="$(mktemp "${TMPDIR:-/tmp}/lz-jsonnet-unoptimized.XXXXXX.wasm")"
optimized="$(mktemp "${TMPDIR:-/tmp}/lz-jsonnet-optimized.XXXXXX.wasm")"
trap 'rm -f "$unoptimized" "$optimized"' EXIT

cd "$runtime_dir"

GOOS=js GOARCH=wasm go build \
  -trimpath \
  -buildvcs=false \
  -ldflags='-s -w -buildid=' \
  -o "$unoptimized" \
  .

"$wasm_opt" "$unoptimized" \
  -Oz \
  --strip-debug \
  --strip-dwarf \
  --strip-producers \
  --enable-bulk-memory \
  --enable-bulk-memory-opt \
  -o "$optimized"

mv "$optimized" libjsonnet.wasm
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" wasm_exec.js

shasum -a 256 -c SHA256SUMS
du -h libjsonnet.wasm
