#!/bin/bash
set -eou pipefail

SCRIPT_FOLDER=$(dirname "${BASH_SOURCE[0]}")
HOOKS_SOURCE_DIR="$SCRIPT_FOLDER/../.githooks"
HOOKS_TARGET_DIR="$SCRIPT_FOLDER/../.git/hooks"

# Check if we're in a Git repository
if [ ! -d ".git" ]; then
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

# Initialize counter for installed hooks
INSTALLED_COUNT=0
ALREADY_EXISTED_COUNT=0

# Process each hook file
for hook in "$HOOKS_SOURCE_DIR"/*; do
  # Get just the filename
  hook_name=$(basename "$hook")

  # Skip if it's not a regular file
  if [ ! -f "$hook" ]; then
    continue
  fi

  target_hook="$HOOKS_TARGET_DIR/$hook_name"

  # Check if hook already exists
  if [ -f "$target_hook" ]; then
    ((ALREADY_EXISTED_COUNT++))
  else
    # Copy the hook and make it executable
    cp "$hook" "$target_hook"
    chmod +x "$target_hook"
    echo "Installed git hook for automated execution of templates: $hook_name"
    ((INSTALLED_COUNT++))
  fi
done

# Ensure jsonnet is installed and available on the PATH
if ! command -v jsonnet &>/dev/null; then
  echo "Error: 'jsonnet' command not found. 🤷" >&2
  echo "Please install Jsonnet and make sure it's in your system's PATH." >&2
  echo "📦 Using Package managers:" >&2
  echo "  brew install jsonnet" >&2
  echo "  pip install jsonnet" >&2
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

# Walk through the directory structure
while IFS= read -r -d '' file; do
  # Get the relative path of the file
  rel_path="${file#$INPUT_DIR/}"

  # Create the output directory if it doesn't exist
  output_dir="$(dirname "$OUTPUT_DIR/$rel_path")"
  mkdir -p "$output_dir"

  # Run jsonnet to generate the JSON file, then format it with Python
  jsonnet_file="$file"
  json_file="$OUTPUT_DIR/$rel_path"
  json_file="${json_file%.jsonnet}.json"
  jsonnet "$jsonnet_file" | python3 "$INPUT_DIR/format_json.py" >"$json_file"
done < <(find "$INPUT_DIR" -type f -name "*.jsonnet" -print0)
