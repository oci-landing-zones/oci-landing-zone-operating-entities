#!/usr/bin/env python3
"""
JSON formatter for OCI Landing Zone configurations.
Formats JSON with terraform fmt-style aligned colons and sorted keys.

Requirements:
- Python 3.8+
- No external dependencies (stdlib only)
- Align colons within each object independently
- Sort keys by priority order, then alphabetically
- Add empty line before nested blocks
- 2-space indentation

Usage:
  # Format from stdin
  cat file.json | format_json.py

  # Format specific files (modifies in-place)
  format_json.py file1.json file2.json

  # Format with glob patterns (modifies in-place)
  format_json.py "configs/*.json"

  # Check if files are formatted correctly (exit 1 if not)
  format_json.py --check file.json
"""
import argparse
import glob as glob_module
import json
import sys
from typing import Any, Dict, List, Tuple


# Configuration constants
INDENT_SIZE = 4  # spaces per indent level

# Keys are sorted in this priority order first, then alphabetically
KEY_PRIORITY_ORDER = [
    "name",
    "display_name",
    "description",
    "id",
    "compartment_id",
    "compartment_key",
    "cidr_blocks",
    "dns_label",
    "block_nat_traffic",
    "is_attach_drg",
    "is_create_igw",
    "is_ipv6enabled",
    "is_oracle_gua_allocation_enabled",
    "type",
    "protocol",
    "port",
    "vcns",
    "subnets",
    "route_tables",
    "default_security_list",
    "security_lists",
    "network_security_groups",
]


def get_key_sort_priority(key: str) -> Tuple[int, str]:
    """
    Return sort priority for a key.
    Returns (priority_index, key) where lower priority_index comes first.
    Keys in KEY_PRIORITY_ORDER get their index, others get a high number.
    """
    try:
        priority = KEY_PRIORITY_ORDER.index(key)
    except ValueError:
        priority = len(KEY_PRIORITY_ORDER)
    return (priority, key)


def is_primitive_value(value: Any) -> bool:
    """
    Check if a value is a primitive type (string, number, boolean, null).
    Returns True for primitives, False for objects and arrays.
    """
    return not isinstance(value, (dict, list))


def sort_dict_keys(obj: Dict[str, Any]) -> List[str]:
    """
    Sort object keys with the following priority:
    1. Primitive values before objects/arrays
    2. Priority keys (from KEY_PRIORITY_ORDER) before other keys
    3. Alphabetically by key name
    """
    def sort_key(key: str) -> Tuple[int, int, str]:
        value = obj[key]
        # Type priority: 0 for primitives, 1 for objects/arrays
        type_priority = 0 if is_primitive_value(value) else 1
        # Key priority from KEY_PRIORITY_ORDER
        key_priority = get_key_sort_priority(key)[0]
        return (type_priority, key_priority, key)

    return sorted(obj.keys(), key=sort_key)


def calculate_global_max_column(data: Any, indent_level: int = 0) -> int:
    """
    Calculate the maximum column position (indentation + key length) for any
    primitive value across the entire JSON structure.
    This enables global alignment of all primitive values.
    """
    max_col = 0

    if isinstance(data, dict):
        for key, value in data.items():
            if is_primitive_value(value):
                # Calculate column position: indent + key with quotes
                col_pos = (INDENT_SIZE * (indent_level + 1)) + len(json.dumps(key))
                max_col = max(max_col, col_pos)

            # Recurse into nested structures
            if isinstance(value, dict):
                max_col = max(max_col, calculate_global_max_column(value, indent_level + 1))
            elif isinstance(value, list):
                max_col = max(max_col, calculate_global_max_column(value, indent_level + 1))

    elif isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                max_col = max(max_col, calculate_global_max_column(item, indent_level + 1))
            elif isinstance(item, list):
                max_col = max(max_col, calculate_global_max_column(item, indent_level + 1))

    return max_col


def is_nested_structure(value: Any) -> bool:
    """
    Check if a value is a nested structure (object or non-empty array).
    """
    if isinstance(value, dict):
        return len(value) > 0
    if isinstance(value, list):
        return len(value) > 0
    return False


def format_primitive(value: Any) -> str:
    """
    Format a primitive value (string, number, boolean, null).
    """
    return json.dumps(value, ensure_ascii=False)


def format_array(arr: List[Any], indent_level: int, global_max_col: int) -> str:
    """
    Format an array with proper indentation.
    Objects inside arrays use global colon alignment for primitives.
    """
    if not arr:
        return "[]"

    indent = " " * (INDENT_SIZE * indent_level)
    next_indent = " " * (INDENT_SIZE * (indent_level + 1))

    lines = ["["]

    for i, item in enumerate(arr):
        if isinstance(item, dict):
            # Format object in array with alignment
            formatted_obj = format_object(item, indent_level + 1, global_max_col)
            lines.append(next_indent + formatted_obj + ("," if i < len(arr) - 1 else ""))
        elif isinstance(item, list):
            # Nested array
            formatted_arr = format_array(item, indent_level + 1, global_max_col)
            lines.append(next_indent + formatted_arr + ("," if i < len(arr) - 1 else ""))
        else:
            # Primitive value in array
            formatted_val = format_primitive(item)
            lines.append(next_indent + formatted_val + ("," if i < len(arr) - 1 else ""))

    lines.append(indent + "]")
    return "\n".join(lines)


def format_object(obj: Dict[str, Any], indent_level: int, global_max_col: int) -> str:
    """
    Format a JSON object with globally aligned colons for primitive values.
    All primitive values across all nesting levels have their colons aligned
    to the same absolute column position.
    Objects and arrays do not participate in colon alignment.
    """
    if not obj:
        return "{}"

    indent = " " * (INDENT_SIZE * indent_level)
    next_indent = " " * (INDENT_SIZE * (indent_level + 1))

    # Sort keys by priority
    sorted_keys = sort_dict_keys(obj)

    lines = ["{"]

    for i, key in enumerate(sorted_keys):
        value = obj[key]
        key_json = json.dumps(key)

        # Only apply spacing for primitive values using global alignment
        if is_primitive_value(value):
            # Calculate current column position
            current_col = len(next_indent) + len(key_json)
            # Calculate spacing to reach global max column
            spacing = " " * (global_max_col - current_col)
        else:
            spacing = ""

        # Add empty line before nested structure (but not for first key)
        if i > 0 and is_nested_structure(value):
            lines.append("")

        # Format the value
        if isinstance(value, dict):
            formatted_value = format_object(value, indent_level + 1, global_max_col)
        elif isinstance(value, list):
            formatted_value = format_array(value, indent_level + 1, global_max_col)
        else:
            formatted_value = format_primitive(value)

        # Build the line with aligned colon (spacing only for primitives)
        comma = "," if i < len(sorted_keys) - 1 else ""
        line = f"{next_indent}{key_json}{spacing}: {formatted_value}{comma}"
        lines.append(line)

    lines.append(indent + "}")
    return "\n".join(lines)


def format_json(data: Any) -> str:
    """
    Main formatting function. Formats JSON data with custom style.
    Calculates global maximum column position for aligning all primitive values.
    """
    # First pass: calculate the global max column for primitive value alignment
    global_max_col = calculate_global_max_column(data)

    # Second pass: format with global alignment
    if isinstance(data, dict):
        result = format_object(data, indent_level=0, global_max_col=global_max_col)
    elif isinstance(data, list):
        result = format_array(data, indent_level=0, global_max_col=global_max_col)
    else:
        result = format_primitive(data)

    # Ensure trailing newline
    return result + "\n"


def process_file(file_path: str, check_mode: bool = False) -> bool:
    """
    Process a single JSON file.

    Args:
        file_path: Path to the JSON file
        check_mode: If True, only check if formatted correctly (don't modify)

    Returns:
        True if file is correctly formatted (or was formatted successfully)
        False if file needs formatting (in check mode) or formatting failed
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            data = json.loads(content)

        formatted = format_json(data)

        if check_mode:
            if content != formatted:
                print(f"✗ {file_path}: needs formatting", file=sys.stderr)
                return False
            else:
                print(f"✓ {file_path}: correctly formatted")
                return True
        else:
            # Write in-place
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(formatted)
            print(f"Formatted: {file_path}")
            return True

    except json.JSONDecodeError as e:
        print(f"Error in {file_path}: Invalid JSON: {e}", file=sys.stderr)
        return False
    except FileNotFoundError as e:
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}", file=sys.stderr)
        return False


def main():
    """
    CLI entry point. Supports stdin, file arguments, and glob patterns.
    """
    parser = argparse.ArgumentParser(
        description='Format JSON files with terraform-style aligned colons and sorted keys.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Format from stdin to stdout
  cat file.json | %(prog)s

  # Format specific files in-place
  %(prog)s file1.json file2.json

  # Format with glob patterns in-place
  %(prog)s "configs/*.json"

  # Check if files are formatted correctly
  %(prog)s --check file.json
        """
    )
    parser.add_argument(
        'files',
        nargs='*',
        help='JSON files to format (supports glob patterns). If not provided, reads from stdin.'
    )
    parser.add_argument(
        '--check',
        action='store_true',
        help='Check if files are formatted correctly without modifying them. Exit 1 if any file needs formatting.'
    )

    args = parser.parse_args()

    try:
        # If no files provided, read from stdin
        if not args.files:
            data = json.load(sys.stdin)
            formatted = format_json(data)
            sys.stdout.write(formatted)
            return 0

        # Expand glob patterns and collect all files
        all_files = []
        for pattern in args.files:
            matched = glob_module.glob(pattern, recursive=True)
            if matched:
                all_files.extend(matched)
            else:
                # If no glob match, treat as literal file path
                all_files.append(pattern)

        if not all_files:
            print("Error: No files matched the provided patterns", file=sys.stderr)
            return 1

        # Process all files
        all_success = True
        for file_path in all_files:
            success = process_file(file_path, check_mode=args.check)
            all_success = all_success and success

        return 0 if all_success else 1

    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
