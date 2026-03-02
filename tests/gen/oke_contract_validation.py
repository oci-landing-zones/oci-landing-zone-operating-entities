#!/usr/bin/env python3


def assert_numeric_icmp_values(node, label: str) -> None:
    if isinstance(node, dict):
        protocol = node.get("protocol")
        if protocol == "ICMP":
            for field in ("icmp_type", "icmp_code"):
                if field in node and not isinstance(node[field], int):
                    raise AssertionError(f"{label}: expected numeric ICMP values, got {field}={node[field]!r}")
        for key, value in node.items():
            child_label = f"{label}.{key}" if label else str(key)
            assert_numeric_icmp_values(value, child_label)
        return

    if isinstance(node, list):
        for index, value in enumerate(node):
            child_label = f"{label}[{index}]"
            assert_numeric_icmp_values(value, child_label)
