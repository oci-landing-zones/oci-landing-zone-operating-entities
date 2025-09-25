#!/bin/bash
set -euo pipefail

if [ $# -ne 3 ]; then
  echo "Usage: $0 <bucket-name> <compartment-ocid> <files-directory>"
  exit 1
fi

BUCKET_NAME="$1"
COMPARTMENT_OCID="$2"
FILES_DIRECTORY="$3"

# === Get namespace ===
NAMESPACE=$(oci os ns get --query "data" --raw-output)

# === Check if bucket exists, create if it doesn't ===
if ! oci os bucket get --namespace "$NAMESPACE" --bucket-name "$BUCKET_NAME" > /dev/null 2>&1; then
  echo "Bucket $BUCKET_NAME not found. Creating..."
  oci os bucket create --namespace "$NAMESPACE" --compartment-id "$COMPARTMENT_OCID" --name "$BUCKET_NAME" --storage-tier Standard
else
  echo "Bucket $BUCKET_NAME already exists."
fi

# === Upload files ===
cd "$FILES_DIRECTORY" || exit 1
find . -path ./docs -prune -o -type f ! -name "./*.sh" ! -name "*.md" ! -name "*.old" -print | while read -r file; do
  echo "Uploading $file ..."
  oci os object put --namespace "$NAMESPACE" --bucket-name "$BUCKET_NAME" --file "$file" --name "$file" --force
done

echo "✅ Upload completed."

