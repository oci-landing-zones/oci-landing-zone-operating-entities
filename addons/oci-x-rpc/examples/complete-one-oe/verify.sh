#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)
JSONNET_BIN=${JSONNET_BIN:-jsonnet}
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

JSONNET_BIN="$JSONNET_BIN" bash "$REPO_ROOT/gen/generate.sh" --config \
  "$REPO_ROOT/addons/oci-lz-blueprint-factory/examples/05-xrpc-cross-tenancy-acceptor.json" \
  "$TMP_DIR/acceptor"

JSONNET_BIN="$JSONNET_BIN" bash "$REPO_ROOT/gen/generate.sh" --config \
  "$REPO_ROOT/addons/oci-lz-blueprint-factory/examples/06-xrpc-cross-tenancy-requester.json" \
  "$TMP_DIR/requester"

diff -ru "$SCRIPT_DIR/acceptor" "$TMP_DIR/acceptor"
diff -ru "$SCRIPT_DIR/requester" "$TMP_DIR/requester"

echo "Complete One-OE X-RPC examples match canonical generation."
