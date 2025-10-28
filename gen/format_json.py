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


def is_inline_array(value: Any) -> bool:
    """
    Check if a value is an empty array or 1-2 element array containing only primitives.
    Each element must be at most 60 characters when formatted.
    These arrays should be formatted inline with colon alignment.
    Returns True for empty arrays or 1-2 element arrays with primitives, False otherwise.
    """
    if not isinstance(value, list):
        return False
    if len(value) == 0:
        return True
    if len(value) <= 2:
        # Check that all items are primitives and each formatted item is <= 60 chars
        for item in value:
            if not is_primitive_value(item):
                return False
            formatted = json.dumps(item, ensure_ascii=False)
            if len(formatted) > 60:
                return False
        return True
    return False


def is_empty_object(value: Any) -> bool:
    """
    Check if a value is an empty object {}.
    Empty objects should be formatted inline with colon alignment.
    Returns True for empty objects, False otherwise.
    """
    return isinstance(value, dict) and len(value) == 0


def parse_cidr(cidr: str) -> Tuple[int, int]:
    """
    Parse a CIDR block into a tuple for sorting.
    Returns (ip_as_int, prefix_length) for semantic IP sorting.
    Invalid CIDRs return (max_int, max_int) to sort them last.
    """
    try:
        if '/' not in cidr:
            return (2**32, 2**32)
        ip_part, prefix = cidr.split('/')
        octets = [int(x) for x in ip_part.split('.')]
        if len(octets) != 4 or any(o < 0 or o > 255 for o in octets):
            return (2**32, 2**32)
        ip_int = (octets[0] << 24) + (octets[1] << 16) + (octets[2] << 8) + octets[3]
        return (ip_int, int(prefix))
    except (ValueError, AttributeError):
        return (2**32, 2**32)


def sort_array_items(arr: List[Any], parent_key: str = None) -> List[Any]:
    """
    Sort array items based on parent key context.
    - For 'subnets': sort by CIDR block semantically (IP address order)
    - For 'drg_route_distributions': sort by priority field
    - Otherwise: return unsorted
    """
    if parent_key == 'subnets':
        # Sort subnet objects by cidr_block field
        def get_subnet_cidr(item):
            if isinstance(item, dict) and 'cidr_block' in item:
                return parse_cidr(item['cidr_block'])
            return (2**32, 2**32)
        return sorted(arr, key=get_subnet_cidr)

    elif parent_key == 'drg_route_distributions':
        # Sort by priority field (lower priority first)
        def get_priority(item):
            if isinstance(item, dict) and 'priority' in item:
                try:
                    return int(item['priority'])
                except (ValueError, TypeError):
                    return float('inf')
            return float('inf')
        return sorted(arr, key=get_priority)

    return arr


def sort_dict_keys(obj: Dict[str, Any]) -> List[str]:
    """
    Sort object keys with the following priority:
    1. If all values are dicts with 'priority' field: sort by priority (ascending)
    2. Otherwise: primitive values before objects/arrays
    3. Priority keys (from KEY_PRIORITY_ORDER) before other keys
    4. Alphabetically by key name
    """
    # Check if all values are dicts with a 'priority' field
    if obj and all(isinstance(v, dict) and 'priority' in v for v in obj.values()):
        # Sort by priority field (ascending)
        def priority_sort_key(key: str) -> int:
            try:
                return int(obj[key]['priority'])
            except (ValueError, TypeError, KeyError):
                return float('inf')
        return sorted(obj.keys(), key=priority_sort_key)

    # Default sorting logic
    def sort_key(key: str) -> Tuple[int, int, str]:
        value = obj[key]
        # Type priority: 0 for primitives/empty objects/inline arrays, 1 for non-empty objects/arrays
        type_priority = 0 if (is_primitive_value(value) or is_empty_object(value) or is_inline_array(value)) else 1
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
            # Calculate column position for ALL keys (every key has a colon after it)
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


def format_array(arr: List[Any], indent_level: int, global_max_col: int, parent_key: str = None) -> str:
    """
    Format an array with proper indentation.
    Objects inside arrays use global colon alignment for primitives.
    Arrays are sorted based on parent_key context (e.g., subnets by CIDR, drg_route_distributions by priority).
    """
    if not arr:
        return "[]"

    # Sort array items based on parent key context
    sorted_arr = sort_array_items(arr, parent_key)

    indent = " " * (INDENT_SIZE * indent_level)
    next_indent = " " * (INDENT_SIZE * (indent_level + 1))

    lines = ["["]

    for i, item in enumerate(sorted_arr):
        if isinstance(item, dict):
            # Format object in array with alignment
            formatted_obj = format_object(item, indent_level + 1, global_max_col)
            lines.append(next_indent + formatted_obj + ("," if i < len(sorted_arr) - 1 else ""))
        elif isinstance(item, list):
            # Nested array
            formatted_arr = format_array(item, indent_level + 1, global_max_col, None)
            lines.append(next_indent + formatted_arr + ("," if i < len(sorted_arr) - 1 else ""))
        else:
            # Primitive value in array
            formatted_val = format_primitive(item)
            lines.append(next_indent + formatted_val + ("," if i < len(sorted_arr) - 1 else ""))

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

        # Apply spacing for primitives, inline arrays, and empty objects using global alignment
        if is_primitive_value(value) or is_inline_array(value) or is_empty_object(value):
            # Calculate current column position
            current_col = len(next_indent) + len(key_json)
            # Calculate spacing to reach global max column
            spacing = " " * (global_max_col - current_col)
        else:
            spacing = ""

        # Add empty line before nested structure (but not for first key or inline arrays)
        if i > 0 and is_nested_structure(value) and not is_inline_array(value):
            lines.append("")

        # Format the value
        if isinstance(value, dict):
            formatted_value = format_object(value, indent_level + 1, global_max_col)
        elif isinstance(value, list):
            # Format empty arrays and 1-2 element primitive arrays inline
            if is_inline_array(value):
                if len(value) == 0:
                    formatted_value = "[]"
                elif len(value) == 1:
                    formatted_value = f"[{format_primitive(value[0])}]"
                else:  # len(value) == 2
                    formatted_value = f"[{format_primitive(value[0])}, {format_primitive(value[1])}]"
            else:
                formatted_value = format_array(value, indent_level + 1, global_max_col, key)
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
        result = format_array(data, indent_level=0, global_max_col=global_max_col, parent_key=None)
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
