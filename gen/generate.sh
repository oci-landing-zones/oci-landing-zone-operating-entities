#!/bin/bash

# Set the input and output directories
INPUT_DIR="."
OUTPUT_DIR=".."

# Walk through the directory structure
while IFS= read -r -d '' file; do
  # Get the relative path of the file
  rel_path="${file#$INPUT_DIR/}"

  # Create the output directory if it doesn't exist
  output_dir="$(dirname "$OUTPUT_DIR/$rel_path")"
  mkdir -p "$output_dir"

  # Run jsonnet to generate the JSON file
  jsonnet_file="$file"
  json_file="$OUTPUT_DIR/$rel_path"
  json_file="${json_file%.jsonnet}.json"
  jsonnet "$jsonnet_file" >"$json_file"
done < <(find "$INPUT_DIR" -type f -name "*.jsonnet" -print0)
