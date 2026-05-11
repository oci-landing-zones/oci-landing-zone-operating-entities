#!/bin/bash
set -euo pipefail

SCRIPT_FOLDER=$(dirname "${BASH_SOURCE[0]}")
HOOKS_SOURCE_DIR="$SCRIPT_FOLDER/../.githooks"
HOOKS_TARGET_DIR="$SCRIPT_FOLDER/../.git/hooks"

# Check if we're in a Git repository
if [ ! -d "$SCRIPT_FOLDER/../.git" ]; then
  echo "Error: This is not a Git repository."
  exit 1
fi

# Check if the source hooks directory exists
if [ ! -d "$HOOKS_SOURCE_DIR" ]; then
  echo "Error: Hooks source directory '$HOOKS_SOURCE_DIR' not found."
  exit 1
fi

# Create target hooks directory if it doesn't exist
mkdir -p "$HOOKS_TARGET_DIR"

# Process each hook file
for hook in "$HOOKS_SOURCE_DIR"/*; do
  hook_name=$(basename "$hook")

  if [ ! -f "$hook" ]; then
    continue
  fi

  target_hook="$HOOKS_TARGET_DIR/$hook_name"

  if [ ! -f "$target_hook" ]; then
    cp "$hook" "$target_hook"
    chmod +x "$target_hook"
    echo "Installed git hook: $hook_name"
  fi
done

# Select Jsonnet renderer. Local developer runs prefer jrsonnet when installed
# because it is much faster. CI/CD must use canonical jsonnet so we keep
# compatibility with the renderer used by supported automation.
JSONNET_BIN="${JSONNET_BIN:-}"
if [[ -n "${CI:-}" && "${CI:-}" != "0" && "${CI:-}" != "false" ]]; then
  JSONNET_BIN="${JSONNET_BIN:-jsonnet}"
  if [[ "${JSONNET_BIN##*/}" != "jsonnet" ]]; then
    echo "Error: CI/CD generation must use canonical 'jsonnet', not '$JSONNET_BIN'." >&2
    echo "Unset JSONNET_BIN or set it to a jsonnet binary path." >&2
    exit 1
  fi
elif [[ -z "$JSONNET_BIN" ]]; then
  if command -v jrsonnet &>/dev/null; then
    JSONNET_BIN=jrsonnet
  else
    JSONNET_BIN=jsonnet
  fi
fi

if ! command -v "$JSONNET_BIN" &>/dev/null; then
  echo "Error: '$JSONNET_BIN' command not found." >&2
  echo "Install canonical jsonnet for config-based LZ generation and all CI/CD runs:" >&2
  echo "  brew install jsonnet" >&2
  echo "  pip install jsonnet" >&2
  echo "Optional local fast renderer for developer test/generation loops:" >&2
  echo "  brew install jrsonnet" >&2
  exit 1
fi

# Ensure Python 3 is installed and available on the PATH
if ! command -v python3 &>/dev/null; then
  echo "Error: 'python3' command not found." >&2
  echo "Please install Python 3.8+ and make sure it's in your system's PATH." >&2
  echo "📦 Using Package managers:" >&2
  echo "  brew install python3" >&2
  echo "  apt-get install python3" >&2
  exit 1
fi

# Set the input and output directories
INPUT_DIR=$(dirname "${BASH_SOURCE[0]}")
OUTPUT_DIR="$INPUT_DIR/.."

# --- Config mode: generate all outputs from a single config file ---
if [[ "${1:-}" == "--config" ]]; then
  CONFIG_FILE="${2:?Usage: generate.sh --config <config_file> [output_dir]}"
  CONFIG_OUTPUT_DIR="${3:-output}"
  mkdir -p "$CONFIG_OUTPUT_DIR"
  find "$CONFIG_OUTPUT_DIR" -maxdepth 1 -type f -name '*.json' -delete

  # --multi writes files directly AND prints paths to stdout.
  # Collect output file list first, then format in a separate loop
  # to keep set -e effective for each formatting command.
  output_files=$("$JSONNET_BIN" --multi "$CONFIG_OUTPUT_DIR/" \
    --tla-code-file "config=$CONFIG_FILE" \
    "$INPUT_DIR/landing_zone_multi.jsonnet")

  while read -r outfile; do
    python3 "$INPUT_DIR/format_json.py" < "$outfile" > "${outfile}.tmp" && mv "${outfile}.tmp" "$outfile"
  done <<< "$output_files"

  echo "Generated config outputs in $CONFIG_OUTPUT_DIR/"
  exit 0
fi

# Walk through the directory structure
while IFS= read -r -d '' file; do
  # Get the relative path of the file
  rel_path="${file#$INPUT_DIR/}"

  # Create the output directory if it doesn't exist
  output_dir="$(dirname "$OUTPUT_DIR/$rel_path")"
  mkdir -p "$output_dir"

  # Run Jsonnet to generate the JSON file, then format it with Python
  jsonnet_file="$file"
  json_file="$OUTPUT_DIR/$rel_path"
  json_file="${json_file%.jsonnet}.json"
  "$JSONNET_BIN" "$jsonnet_file" | python3 "$INPUT_DIR/format_json.py" >"$json_file"
done < <(
  find "$INPUT_DIR" \
    -path "$INPUT_DIR/testdata" -prune -o \
    -type f -name "*.jsonnet" ! -name "landing_zone_multi.jsonnet" -print0
)
