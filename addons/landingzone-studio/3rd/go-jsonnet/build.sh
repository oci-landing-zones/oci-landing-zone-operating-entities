#!/usr/bin/env bash

set -euo pipefail

runtime_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
studio_dir="$(cd "$runtime_dir/../.." && pwd)"
wasm_opt="$studio_dir/node_modules/.bin/wasm-opt"
export GOCACHE="${GOCACHE:-$studio_dir/node_modules/.cache/go-build}"
export GOMODCACHE="${GOMODCACHE:-$studio_dir/node_modules/.cache/go-mod}"
mkdir -p "$GOCACHE"
mkdir -p "$GOMODCACHE"

go_version="$(go env GOVERSION)"
if [[ ! "$go_version" =~ ^go([0-9]+)\.([0-9]+)(\.[0-9]+)?$ ]] \
  || (( BASH_REMATCH[1] < 1 || (BASH_REMATCH[1] == 1 && BASH_REMATCH[2] < 25) )); then
  echo "go-jsonnet WASM requires Go 1.25 or newer; got $go_version" >&2
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
  --enable-nontrapping-float-to-int \
  -o "$optimized"

mv "$optimized" libjsonnet.wasm
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" wasm_exec.js

{
  shasum -a 256 build.sh main.go go.mod go.sum
  printf '%s  %s\n' "$go_version" 'go-version'
  "$wasm_opt" --version | shasum -a 256 | sed 's/  -$/  wasm-opt-version/'
} | shasum -a 256 | awk '{print $1}' > .runtime-build-fingerprint
du -h libjsonnet.wasm
