#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)
JSONNET_BIN=${JSONNET_BIN:-jsonnet}

JSONNET_BIN="$JSONNET_BIN" bash "$REPO_ROOT/gen/generate.sh" --config \
  "$REPO_ROOT/addons/oci-lz-blueprint-factory/examples/05-xrpc-cross-tenancy-acceptor.json" \
  "$SCRIPT_DIR/acceptor"

JSONNET_BIN="$JSONNET_BIN" bash "$REPO_ROOT/gen/generate.sh" --config \
  "$REPO_ROOT/addons/oci-lz-blueprint-factory/examples/06-xrpc-cross-tenancy-requester.json" \
  "$SCRIPT_DIR/requester"
