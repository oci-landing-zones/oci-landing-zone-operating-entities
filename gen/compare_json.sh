#!/usr/bin/env bash
#
# compare_json.sh - Semantic JSON comparison tool
#
# Compares JSON files between remote branch and local working directory
# to verify semantic equivalence (ignoring formatting differences).
#
# Usage:
#   ./gen/compare_json.sh                           # Compare all modified JSON vs origin/current-branch
#   ./gen/compare_json.sh -b master                 # Compare against different branch
#   ./gen/compare_json.sh -v                        # Verbose mode with detailed diffs
#   ./gen/compare_json.sh file1.json file2.json    # Compare specific files
#   ./gen/compare_json.sh -h                        # Show help
#

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Global variables
BRANCH=""
VERBOSE=false
QUIET=false
FILES=()
TEMP_FILES=()

# Counters
total=0
identical=0
different=0
errors=0

# Arrays for tracking results
declare -a different_files
declare -a error_files

# Show help message
show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS] [FILES...]

Compares JSON files between remote branch and local working directory
to verify semantic equivalence (ignoring formatting differences).

OPTIONS:
  -b, --branch BRANCH   Target branch for comparison (default: origin/current-branch)
  -v, --verbose         Show detailed diffs for semantically different files
  -q, --quiet           Only show summary, suppress per-file output
  -h, --help            Display this help message

ARGUMENTS:
  FILES...              Specific files to compare (overrides auto-discovery)
                        If not provided, auto-discovers modified JSON files from git status

EXAMPLES:
  # Compare all modified JSON files against origin/v3.0.0-rc
  $(basename "$0")

  # Compare against a different branch
  $(basename "$0") -b master

  # Compare specific files with verbose output
  $(basename "$0") -v file1.json file2.json

  # Quiet mode - only show summary
  $(basename "$0") -q

EXIT CODES:
  0 - All files are semantically identical
  1 - One or more differences found OR errors encountered

REQUIREMENTS:
  - jq (JSON processor)
  - git

EOF
}

# Validate prerequisites
validate_prerequisites() {
  # Check if jq is installed
  if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq is not installed. Please install jq to use this tool." >&2
    echo "  macOS: brew install jq" >&2
    echo "  Linux: apt-get install jq or yum install jq" >&2
    exit 1
  fi

  # Check if we're in a git repository
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo "Error: Not in a git repository." >&2
    exit 1
  fi
}

# Get current branch name
get_current_branch() {
  git rev-parse --abbrev-ref HEAD
}

# Discover modified JSON files from git status
discover_modified_files() {
  local current_branch
  current_branch=$(get_current_branch)

  # If branch not set, default to origin/current-branch
  if [[ -z "$BRANCH" ]]; then
    BRANCH="origin/${current_branch}"
  fi

  # Validate that target branch exists
  if ! git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
    echo "Error: Branch '$BRANCH' does not exist." >&2
    exit 1
  fi

  # Get modified JSON files
  local files
  files=$(git diff --name-only "$BRANCH" | grep -E '\.(json|auto\.tfvars\.json)$' || true)

  if [[ -z "$files" ]]; then
    echo "No modified JSON files found between local and $BRANCH" >&2
    return 1
  fi

  # Convert to array
  mapfile -t FILES < <(echo "$files")
}

# Create temporary file and track it for cleanup
create_temp_file() {
  local temp_file
  temp_file=$(mktemp)
  TEMP_FILES+=("$temp_file")
  echo "$temp_file"
}

# Cleanup temporary files
cleanup() {
  for temp_file in "${TEMP_FILES[@]}"; do
    [[ -f "$temp_file" ]] && rm -f "$temp_file"
  done
}

# Compare a single file
compare_file() {
  local file="$1"
  local remote_norm local_norm
  local remote_status local_status

  remote_norm=$(create_temp_file)
  local_norm=$(create_temp_file)

  # Check if file exists locally
  if [[ ! -f "$file" ]]; then
    if [[ "$QUIET" == false ]]; then
      echo -e "${YELLOW}[!]${NC} $file - File not found locally"
    fi
    error_files+=("$file (not found locally)")
    ((errors++))
    return 1
  fi

  # Fetch and normalize remote version
  remote_status=0
  if ! git show "$BRANCH:$file" 2>/dev/null | jq -S . > "$remote_norm" 2>&1; then
    remote_status=$?
  fi

  if [[ $remote_status -ne 0 ]]; then
    if [[ "$QUIET" == false ]]; then
      echo -e "${YELLOW}[!]${NC} $file - Not found in remote branch or invalid JSON"
    fi
    error_files+=("$file (not found in $BRANCH or invalid JSON)")
    ((errors++))
    return 1
  fi

  # Normalize local version
  local_status=0
  if ! jq -S . "$file" > "$local_norm" 2>&1; then
    local_status=$?
  fi

  if [[ $local_status -ne 0 ]]; then
    if [[ "$QUIET" == false ]]; then
      echo -e "${YELLOW}[!]${NC} $file - Invalid JSON in local file"
    fi
    error_files+=("$file (invalid JSON in local file)")
    ((errors++))
    return 1
  fi

  # Compare normalized versions
  if diff -q "$remote_norm" "$local_norm" >/dev/null 2>&1; then
    if [[ "$QUIET" == false ]]; then
      echo -e "${GREEN}[✓]${NC} $file - Identical"
    fi
    ((identical++))
    return 0
  else
    if [[ "$QUIET" == false ]]; then
      echo -e "${RED}[✗]${NC} $file - DIFFERENT"
    fi
    different_files+=("$file")
    ((different++))

    # Store diff for verbose output later
    if [[ "$VERBOSE" == true ]]; then
      local diff_file
      diff_file=$(create_temp_file)
      diff -u "$remote_norm" "$local_norm" > "$diff_file" 2>&1 || true
      echo "$diff_file" > "${remote_norm}.diff_path"
    fi

    return 1
  fi
}

# Show detailed diffs for different files
show_detailed_diffs() {
  if [[ $different -eq 0 ]]; then
    return
  fi

  echo ""
  echo "========================================"
  echo "DETAILED DIFFERENCES"
  echo "========================================"
  echo ""

  for file in "${different_files[@]}"; do
    echo "File: $file"
    echo "----------------------------------------"

    # Find the diff file created during comparison
    local remote_norm local_norm diff_output
    remote_norm=$(create_temp_file)
    local_norm=$(create_temp_file)

    # Regenerate normalized versions
    git show "$BRANCH:$file" 2>/dev/null | jq -S . > "$remote_norm" 2>&1 || true
    jq -S . "$file" > "$local_norm" 2>&1 || true

    # Show diff with context
    diff_output=$(diff -u "$remote_norm" "$local_norm" 2>&1 || true)

    # Replace temp file names with meaningful labels
    echo "$diff_output" | sed "s|$remote_norm|Remote ($BRANCH)|g" | sed "s|$local_norm|Local (working directory)|g"
    echo ""
  done
}

# Generate summary report
generate_summary() {
  echo ""
  echo "========================================"
  echo "SUMMARY"
  echo "========================================"
  printf "%-25s %d\n" "Total files:" "$total"
  printf "%-25s %d\n" "Semantically identical:" "$identical"
  printf "%-25s %d\n" "Semantically different:" "$different"
  printf "%-25s %d\n" "Errors/Not found:" "$errors"
  echo ""

  if [[ $different -gt 0 ]]; then
    echo "FILES WITH DIFFERENCES:"
    for file in "${different_files[@]}"; do
      echo "  $file"
    done
    echo ""
  fi

  if [[ $errors -gt 0 ]]; then
    echo "FILES WITH ERRORS:"
    for error in "${error_files[@]}"; do
      echo "  $error"
    done
    echo ""
  fi

  # Determine exit code message
  if [[ $different -eq 0 && $errors -eq 0 ]]; then
    echo "✓ All files are semantically identical"
    echo "Exit code: 0"
  else
    if [[ $different -gt 0 ]]; then
      echo "✗ Found semantic differences in $different file(s)"
    fi
    if [[ $errors -gt 0 ]]; then
      echo "✗ Encountered errors with $errors file(s)"
    fi
    echo "Exit code: 1"
  fi
}

# Parse command-line arguments
parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help)
        show_help
        exit 0
        ;;
      -b|--branch)
        if [[ -z "${2:-}" ]]; then
          echo "Error: --branch requires a branch name" >&2
          exit 1
        fi
        BRANCH="$2"
        shift 2
        ;;
      -v|--verbose)
        VERBOSE=true
        shift
        ;;
      -q|--quiet)
        QUIET=true
        shift
        ;;
      -*)
        echo "Error: Unknown option: $1" >&2
        echo "Use -h or --help for usage information" >&2
        exit 1
        ;;
      *)
        # Positional argument - file to compare
        FILES+=("$1")
        shift
        ;;
    esac
  done
}

# Main execution
main() {
  # Set up cleanup trap
  trap cleanup EXIT INT TERM

  # Parse arguments
  parse_arguments "$@"

  # Validate prerequisites
  validate_prerequisites

  # Discover files if none provided
  if [[ ${#FILES[@]} -eq 0 ]]; then
    if ! discover_modified_files; then
      exit 0
    fi
  else
    # If branch not set and files provided, use origin/current-branch
    if [[ -z "$BRANCH" ]]; then
      local current_branch
      current_branch=$(get_current_branch)
      BRANCH="origin/${current_branch}"
    fi

    # Validate that target branch exists
    if ! git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
      echo "Error: Branch '$BRANCH' does not exist." >&2
      exit 1
    fi
  fi

  # Display header
  if [[ "$QUIET" == false ]]; then
    echo "Comparing JSON files semantically..."
    echo "Target branch: $BRANCH"
    echo "Files to check: ${#FILES[@]}"
    echo ""
    echo "Processing files:"
  fi

  # Process each file
  total=${#FILES[@]}
  for file in "${FILES[@]}"; do
    compare_file "$file" || true
  done

  # Show detailed diffs if verbose mode
  if [[ "$VERBOSE" == true ]]; then
    show_detailed_diffs
  fi

  # Generate summary
  generate_summary

  # Exit with appropriate code
  if [[ $different -eq 0 && $errors -eq 0 ]]; then
    exit 0
  else
    exit 1
  fi
}

# Run main function
main "$@"
