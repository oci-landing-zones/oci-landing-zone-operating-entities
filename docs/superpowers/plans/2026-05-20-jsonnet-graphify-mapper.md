# Jsonnet Graphify Mapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local tree-sitter-based Jsonnet mapper that writes `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`, and `graphify-out/graph.html` for guided refactoring.

**Architecture:** One focused Python script parses `gen/**/*.libsonnet` and `gen/**/*.jsonnet` with `tree_sitter_language_pack`'s Jsonnet parser, normalizes extracted structures into node-link JSON, computes simple communities/refactor metrics, and writes static artifacts. Tests use small Jsonnet fixtures and Python `unittest` to pin the graph schema, confidence labels, and key extracted relationships.

**Tech Stack:** Python 3 standard library, `tree_sitter`, `tree_sitter_language_pack`, Jsonnet grammar from the installed language pack, existing `unittest` test style.

---

## File Structure

- Create `tools/graphify_jsonnet.py`
  - Single-purpose generator script.
  - Responsibilities: discover Jsonnet files, parse with tree-sitter, extract nodes/edges, resolve simple references, compute metrics/communities, write JSON/report/HTML.
- Create `tests/graphify/__init__.py`
  - Makes the graphify test folder importable by `unittest`.
- Create `tests/graphify/test_graphify_jsonnet.py`
  - Fixture-driven tests for extraction and output schema.
- Create `tests/graphify/fixtures/simple/main.libsonnet`
  - Minimal Jsonnet source with import, local function, object fields, call/reference, assertion, and rationale comment.
- Create `tests/graphify/fixtures/simple/dep.libsonnet`
  - Imported dependency fixture.
- Generated, not committed unless explicitly wanted after review: `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.html`.

## Task 1: Test scaffold and minimal graph schema

**Files:**
- Create: `tests/graphify/__init__.py`
- Create: `tests/graphify/fixtures/simple/main.libsonnet`
- Create: `tests/graphify/fixtures/simple/dep.libsonnet`
- Create: `tests/graphify/test_graphify_jsonnet.py`
- Create: `tools/graphify_jsonnet.py`

- [ ] **Step 1: Create fixture files**

Create `tests/graphify/__init__.py` as an empty file.

Create `tests/graphify/fixtures/simple/dep.libsonnet`:

```jsonnet
{
  helper(name):: 'hello ' + name,
  settings: {
    enabled: true,
  },
}
```

Create `tests/graphify/fixtures/simple/main.libsonnet`:

```jsonnet
// Contract: caller names must stay stable for generated outputs.
local dep = import 'dep.libsonnet';
local makeName(prefix):: prefix + '-lz';
{
  assert std.length('abc') > 0,
  service(name):: dep.helper(makeName(name)),
  config: {
    enabled: dep.settings.enabled,
  },
}
```

- [ ] **Step 2: Write failing schema/import test**

Create `tests/graphify/test_graphify_jsonnet.py` with this content:

```python
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools import graphify_jsonnet


REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_DIR = REPO_ROOT / "tests" / "graphify" / "fixtures" / "simple"


class GraphifyJsonnetTests(unittest.TestCase):
    def test_fixture_graph_has_required_schema_and_import_edge(self) -> None:
        graph = graphify_jsonnet.build_graph(FIXTURE_DIR)

        self.assertIn("nodes", graph)
        self.assertIn("links", graph)
        self.assertGreaterEqual(len(graph["nodes"]), 4)
        self.assertGreaterEqual(len(graph["links"]), 3)

        required_node_keys = {"id", "label", "type", "source_file", "source_location"}
        for node in graph["nodes"]:
            self.assertTrue(required_node_keys.issubset(node), node)

        required_edge_keys = {
            "source",
            "target",
            "relation",
            "confidence",
            "confidence_score",
            "source_file",
        }
        for edge in graph["links"]:
            self.assertTrue(required_edge_keys.issubset(edge), edge)

        import_edges = [edge for edge in graph["links"] if edge["relation"] == "IMPORTS"]
        self.assertEqual(1, len(import_edges))
        self.assertEqual("EXTRACTED", import_edges[0]["confidence"])
        self.assertEqual(1.0, import_edges[0]["confidence_score"])
        self.assertTrue(import_edges[0]["target"].endswith("dep.libsonnet"))

    def test_write_outputs_creates_three_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir) / "graphify-out"
            graphify_jsonnet.write_outputs(FIXTURE_DIR, out_dir)

            graph_path = out_dir / "graph.json"
            report_path = out_dir / "GRAPH_REPORT.md"
            html_path = out_dir / "graph.html"

            self.assertTrue(graph_path.exists())
            self.assertTrue(report_path.exists())
            self.assertTrue(html_path.exists())

            graph = json.loads(graph_path.read_text(encoding="utf-8"))
            self.assertIn("nodes", graph)
            self.assertIn("links", graph)
            self.assertIn("Most Important Concepts", report_path.read_text(encoding="utf-8"))
            self.assertIn("Jsonnet Graphify Viewer", html_path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
python3 -m unittest tests.graphify.test_graphify_jsonnet -v
```

Expected: FAIL because `tools/graphify_jsonnet.py` does not exist or does not yet define `build_graph`.

- [ ] **Step 4: Add minimal implementation skeleton**

Create `tools/graphify_jsonnet.py` with this content:

```python
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class Node:
    id: str
    label: str
    type: str
    source_file: str
    source_location: str
    community: str = "unclustered"


@dataclass(frozen=True)
class Edge:
    source: str
    target: str
    relation: str
    confidence: str
    confidence_score: float
    source_file: str


def iter_jsonnet_files(root: Path) -> list[Path]:
    return sorted(
        path
        for pattern in ("**/*.libsonnet", "**/*.jsonnet")
        for path in root.glob(pattern)
        if "graphify-out" not in path.parts
    )


def rel(path: Path, root: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def file_node_id(path: Path, root: Path) -> str:
    return f"file:{rel(path, root)}"


def build_graph(root: Path | str) -> dict[str, Any]:
    root_path = Path(root)
    nodes: dict[str, Node] = {}
    edges: list[Edge] = []

    files = iter_jsonnet_files(root_path)
    for path in files:
        relative = rel(path, root_path)
        node_id = f"file:{relative}"
        nodes[node_id] = Node(
            id=node_id,
            label=path.name,
            type="file",
            source_file=relative,
            source_location="1:1",
            community=path.parent.relative_to(root_path).as_posix() if path.parent != root_path else ".",
        )

        text = path.read_text(encoding="utf-8")
        for line_number, line in enumerate(text.splitlines(), start=1):
            stripped = line.strip()
            if "import" not in stripped:
                continue
            quote = "'" if "'" in stripped else '"'
            if quote not in stripped:
                continue
            parts = stripped.split(quote)
            if len(parts) < 3:
                continue
            imported = parts[1]
            target_path = (path.parent / imported).resolve()
            try:
                target_relative = target_path.relative_to(root_path.resolve()).as_posix()
            except ValueError:
                target_relative = imported
            target_id = f"file:{target_relative}"
            if target_id not in nodes:
                nodes[target_id] = Node(
                    id=target_id,
                    label=Path(imported).name,
                    type="file",
                    source_file=target_relative,
                    source_location="1:1",
                )
            edges.append(
                Edge(
                    source=node_id,
                    target=target_id,
                    relation="IMPORTS",
                    confidence="EXTRACTED",
                    confidence_score=1.0,
                    source_file=relative,
                )
            )

    graph = {
        "directed": True,
        "multigraph": False,
        "graph": {"name": "jsonnet-project-map", "root": str(root_path)},
        "nodes": [asdict(node) for node in nodes.values()],
        "links": [asdict(edge) for edge in edges],
    }
    return graph


def render_report(graph: dict[str, Any]) -> str:
    return "\n".join(
        [
            "# Jsonnet Graph Report",
            "",
            "## Most Important Concepts / God Nodes",
            "",
            "Initial graph contains file/import structure. Later tasks add centrality and refactor signals.",
            "",
            "## Key Architecture Communities",
            "",
            "Communities are initially path-based.",
            "",
            "## Surprising Cross-File or Cross-Module Connections",
            "",
            "Import edges are listed in graph.json.",
            "",
            "## Important Rationale",
            "",
            "Rationale extraction is added in a later task.",
            "",
            "## Useful Questions",
            "",
            "- Which modules import a given file?",
            "- Which files define many Jsonnet fields?",
            "- Which identifiers are ambiguous across modules?",
            "- Which validation helpers are coupled to config rendering?",
            "- Which folder communities have cross-links?",
            "",
            "## Ambiguous or Low-Confidence Relationships to Review",
            "",
            "Ambiguity detection is added in a later task.",
            "",
        ]
    )


def render_html(graph: dict[str, Any]) -> str:
    graph_json = json.dumps(graph)
    return f"""<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\">
  <title>Jsonnet Graphify Viewer</title>
</head>
<body>
  <h1>Jsonnet Graphify Viewer</h1>
  <input id=\"search\" aria-label=\"Search nodes\" />
  <pre id=\"details\"></pre>
  <script>
    const graph = {graph_json};
    const details = document.getElementById('details');
    const search = document.getElementById('search');
    function render() {{
      const q = search.value.toLowerCase();
      const nodes = graph.nodes.filter(n => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
      details.textContent = JSON.stringify(nodes.slice(0, 50), null, 2);
    }}
    search.addEventListener('input', render);
    render();
  </script>
</body>
</html>
"""


def write_outputs(root: Path | str, out_dir: Path | str) -> dict[str, Any]:
    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    graph = build_graph(root)
    (out_path / "graph.json").write_text(json.dumps(graph, indent=2) + "\n", encoding="utf-8")
    (out_path / "GRAPH_REPORT.md").write_text(render_report(graph), encoding="utf-8")
    (out_path / "graph.html").write_text(render_html(graph), encoding="utf-8")
    return graph


def main() -> None:
    write_outputs(Path("gen"), Path("graphify-out"))


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
python3 -m unittest tests.graphify.test_graphify_jsonnet -v
```

Expected: PASS.

- [ ] **Step 6: Commit task 1**

Run:

```bash
git add tools/graphify_jsonnet.py tests/graphify
git commit -m "test: add jsonnet graphify schema scaffold"
```

## Task 2: Tree-sitter query extraction for Jsonnet structure

**Files:**
- Modify: `tools/graphify_jsonnet.py`
- Modify: `tests/graphify/test_graphify_jsonnet.py`

- [ ] **Step 1: Add failing structural extraction test**

Append this test method inside `GraphifyJsonnetTests` in `tests/graphify/test_graphify_jsonnet.py`:

```python
    def test_tree_sitter_extracts_jsonnet_structural_nodes(self) -> None:
        graph = graphify_jsonnet.build_graph(FIXTURE_DIR)
        nodes_by_type = {}
        for node in graph["nodes"]:
            nodes_by_type.setdefault(node["type"], set()).add(node["label"])

        self.assertIn("dep", nodes_by_type.get("local", set()))
        self.assertIn("makeName", nodes_by_type.get("function", set()))
        self.assertIn("service", nodes_by_type.get("function", set()))
        self.assertIn("config", nodes_by_type.get("object_field", set()))
        self.assertIn("assert", nodes_by_type.get("assertion", set()))
        self.assertIn("Contract: caller names must stay stable for generated outputs.", nodes_by_type.get("comment_rationale", set()))

        define_edges = [edge for edge in graph["links"] if edge["relation"] == "DEFINES"]
        self.assertGreaterEqual(len(define_edges), 5)
        self.assertTrue(all(edge["confidence"] == "EXTRACTED" for edge in define_edges))
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest tests.graphify.test_graphify_jsonnet.GraphifyJsonnetTests.test_tree_sitter_extracts_jsonnet_structural_nodes -v
```

Expected: FAIL because the script only extracts file and import edges.

- [ ] **Step 3: Replace parser/extraction internals with tree-sitter query extraction**

Modify `tools/graphify_jsonnet.py` as follows.

Add imports near the top:

```python
import re
from tree_sitter import Node as TSNode
from tree_sitter_language_pack import get_language, get_parser
```

Add constants after imports:

```python
JSONNET_LANGUAGE = get_language("jsonnet")
JSONNET_PARSER = get_parser("jsonnet")

STRUCTURE_QUERY = JSONNET_LANGUAGE.query(
    r'''
    (local_bind
      (bind (id) @local.name)) @local.bind

    (local_bind
      (bind (id) @function.name
        (params) @function.params)) @function.bind

    (member
      (field
        (fieldname (id) @field.name))) @field.member

    (member
      (field
        function: (fieldname (id) @method.name)
        (params) @method.params)) @method.member

    (assert) @assertion.node

    (import
      (string (string_content) @import.path)) @import.node
    '''
)

RATIONALE_WORDS = re.compile(
    r"\b(contract|rationale|must|should|warning|because|why|invariant|source of truth|do not|do n't|cannot|required)\b",
    re.IGNORECASE,
)
```

Add helper functions before `build_graph`:

```python
def node_text(source: bytes, node: TSNode) -> str:
    return source[node.start_byte : node.end_byte].decode("utf-8")


def location(node: TSNode) -> str:
    return f"{node.start_point[0] + 1}:{node.start_point[1] + 1}"


def add_node(nodes: dict[str, Node], node: Node) -> None:
    if node.id not in nodes:
        nodes[node.id] = node


def make_symbol_node(
    *,
    file_relative: str,
    kind: str,
    label: str,
    source_location: str,
    community: str,
) -> Node:
    safe_label = label.replace(" ", "_")
    node_id = f"{kind}:{file_relative}:{source_location}:{safe_label}"
    return Node(
        id=node_id,
        label=label,
        type=kind,
        source_file=file_relative,
        source_location=source_location,
        community=community,
    )


def extract_comment_rationales(path: Path, root: Path, community: str) -> list[Node]:
    relative = rel(path, root)
    nodes: list[Node] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        stripped = line.strip()
        if not stripped.startswith("//"):
            continue
        text = stripped[2:].strip()
        if not text or not RATIONALE_WORDS.search(text):
            continue
        nodes.append(
            make_symbol_node(
                file_relative=relative,
                kind="comment_rationale",
                label=text,
                source_location=f"{line_number}:1",
                community=community,
            )
        )
    return nodes
```

Replace the body of `build_graph` with this implementation:

```python
def build_graph(root: Path | str) -> dict[str, Any]:
    root_path = Path(root)
    nodes: dict[str, Node] = {}
    edges: list[Edge] = []

    files = iter_jsonnet_files(root_path)
    for path in files:
        relative = rel(path, root_path)
        community = path.parent.relative_to(root_path).as_posix() if path.parent != root_path else "."
        file_id = f"file:{relative}"
        add_node(
            nodes,
            Node(
                id=file_id,
                label=path.name,
                type="file",
                source_file=relative,
                source_location="1:1",
                community=community,
            ),
        )

        source = path.read_bytes()
        tree = JSONNET_PARSER.parse(source)
        captures = STRUCTURE_QUERY.captures(tree.root_node)

        for name, captured_nodes in captures.items():
            if name not in {"local.name", "function.name", "field.name", "method.name", "assertion.node", "import.path"}:
                continue
            for captured in captured_nodes:
                if name == "import.path":
                    imported = node_text(source, captured)
                    target_path = (path.parent / imported).resolve()
                    try:
                        target_relative = target_path.relative_to(root_path.resolve()).as_posix()
                    except ValueError:
                        target_relative = imported
                    target_id = f"file:{target_relative}"
                    add_node(
                        nodes,
                        Node(
                            id=target_id,
                            label=Path(imported).name,
                            type="file",
                            source_file=target_relative,
                            source_location="1:1",
                            community=Path(target_relative).parent.as_posix(),
                        ),
                    )
                    edges.append(Edge(file_id, target_id, "IMPORTS", "EXTRACTED", 1.0, relative))
                    continue

                if name == "assertion.node":
                    symbol = make_symbol_node(
                        file_relative=relative,
                        kind="assertion",
                        label="assert",
                        source_location=location(captured),
                        community=community,
                    )
                else:
                    label = node_text(source, captured)
                    kind = {
                        "local.name": "local",
                        "function.name": "function",
                        "field.name": "object_field",
                        "method.name": "function",
                    }[name]
                    symbol = make_symbol_node(
                        file_relative=relative,
                        kind=kind,
                        label=label,
                        source_location=location(captured),
                        community=community,
                    )
                add_node(nodes, symbol)
                edges.append(Edge(file_id, symbol.id, "DEFINES", "EXTRACTED", 1.0, relative))

        for rationale in extract_comment_rationales(path, root_path, community):
            add_node(nodes, rationale)
            edges.append(Edge(file_id, rationale.id, "CONTAINS", "EXTRACTED", 1.0, relative))

    return {
        "directed": True,
        "multigraph": False,
        "graph": {"name": "jsonnet-project-map", "root": str(root_path)},
        "nodes": [asdict(node) for node in sorted(nodes.values(), key=lambda n: n.id)],
        "links": [asdict(edge) for edge in edges],
    }
```

- [ ] **Step 4: Run full graphify tests**

Run:

```bash
python3 -m unittest tests.graphify.test_graphify_jsonnet -v
```

Expected: PASS.

- [ ] **Step 5: Commit task 2**

Run:

```bash
git add tools/graphify_jsonnet.py tests/graphify/test_graphify_jsonnet.py
git commit -m "feat: extract jsonnet structure with tree-sitter"
```

## Task 3: Reference, call, validation, and ambiguity edges

**Files:**
- Modify: `tools/graphify_jsonnet.py`
- Modify: `tests/graphify/test_graphify_jsonnet.py`

- [ ] **Step 1: Add failing relationship test**

Append this test method inside `GraphifyJsonnetTests`:

```python
    def test_references_calls_and_ambiguous_edges_are_labeled(self) -> None:
        graph = graphify_jsonnet.build_graph(FIXTURE_DIR)
        relations = {edge["relation"] for edge in graph["links"]}
        self.assertIn("CALLS", relations)
        self.assertIn("REFERENCES", relations)
        self.assertIn("VALIDATES", relations)

        call_edges = [edge for edge in graph["links"] if edge["relation"] == "CALLS"]
        self.assertTrue(any(edge["confidence"] == "EXTRACTED" for edge in call_edges))

        ambiguous_edges = [edge for edge in graph["links"] if edge["confidence"] == "AMBIGUOUS"]
        self.assertTrue(any("makeName" in edge["target"] for edge in ambiguous_edges), ambiguous_edges)
        self.assertTrue(all(edge["confidence_score"] < 1.0 for edge in ambiguous_edges))
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest tests.graphify.test_graphify_jsonnet.GraphifyJsonnetTests.test_references_calls_and_ambiguous_edges_are_labeled -v
```

Expected: FAIL because relationship extraction is not implemented.

- [ ] **Step 3: Add relationship queries and resolver helpers**

Add these constants after `STRUCTURE_QUERY` in `tools/graphify_jsonnet.py`:

```python
RELATIONSHIP_QUERY = JSONNET_LANGUAGE.query(
    r'''
    (functioncall
      (id) @call.name) @call.node

    (functioncall
      (fieldaccess
        (id) @call.object
        last: (id) @call.method)) @method_call.node

    (fieldaccess
      (id) @fieldref.object
      last: (id) @fieldref.field) @fieldref.node

    (id) @identifier.name
    '''
)

BUILTIN_IDENTIFIERS = {
    "std",
    "self",
    "super",
    "true",
    "false",
    "null",
}
```

Add these helper functions before `build_graph`:

```python
def index_symbols(nodes: dict[str, Node]) -> dict[str, list[Node]]:
    index: dict[str, list[Node]] = {}
    for node in nodes.values():
        if node.type in {"local", "function", "object_field", "assertion"}:
            index.setdefault(node.label, []).append(node)
    return index


def unresolved_node(nodes: dict[str, Node], *, label: str, source_file: str, source_location: str, community: str) -> Node:
    node_id = f"unresolved:{source_file}:{source_location}:{label}"
    node = Node(
        id=node_id,
        label=label,
        type="unresolved_reference",
        source_file=source_file,
        source_location=source_location,
        community=community,
    )
    add_node(nodes, node)
    return node


def add_reference_edge(
    *,
    edges: list[Edge],
    nodes: dict[str, Node],
    source_file_id: str,
    symbol_index: dict[str, list[Node]],
    label: str,
    source_file: str,
    source_location: str,
    community: str,
    relation: str,
) -> None:
    if label in BUILTIN_IDENTIFIERS:
        return
    candidates = symbol_index.get(label, [])
    if len(candidates) == 1:
        edges.append(Edge(source_file_id, candidates[0].id, relation, "EXTRACTED", 1.0, source_file))
        return
    if len(candidates) > 1:
        target = candidates[0]
        edges.append(Edge(source_file_id, target.id, relation, "AMBIGUOUS", 0.45, source_file))
        return
    target = unresolved_node(
        nodes,
        label=label,
        source_file=source_file,
        source_location=source_location,
        community=community,
    )
    edges.append(Edge(source_file_id, target.id, relation, "AMBIGUOUS", 0.25, source_file))
```

- [ ] **Step 4: Add second-pass relationship extraction in `build_graph`**

In `build_graph`, after the first loop that creates file/definition/import/comment nodes, add this second loop before returning the graph:

```python
    symbol_index = index_symbols(nodes)
    for path in files:
        relative = rel(path, root_path)
        community = path.parent.relative_to(root_path).as_posix() if path.parent != root_path else "."
        file_id = f"file:{relative}"
        source = path.read_bytes()
        tree = JSONNET_PARSER.parse(source)
        captures = RELATIONSHIP_QUERY.captures(tree.root_node)

        for name, captured_nodes in captures.items():
            if name == "call.name":
                for captured in captured_nodes:
                    label = node_text(source, captured)
                    relation = "VALIDATES" if label == "assert" or label.startswith("validate") else "CALLS"
                    add_reference_edge(
                        edges=edges,
                        nodes=nodes,
                        source_file_id=file_id,
                        symbol_index=symbol_index,
                        label=label,
                        source_file=relative,
                        source_location=location(captured),
                        community=community,
                        relation=relation,
                    )
            elif name == "call.method":
                for captured in captured_nodes:
                    label = node_text(source, captured)
                    add_reference_edge(
                        edges=edges,
                        nodes=nodes,
                        source_file_id=file_id,
                        symbol_index=symbol_index,
                        label=label,
                        source_file=relative,
                        source_location=location(captured),
                        community=community,
                        relation="CALLS",
                    )
            elif name == "identifier.name":
                for captured in captured_nodes:
                    label = node_text(source, captured)
                    add_reference_edge(
                        edges=edges,
                        nodes=nodes,
                        source_file_id=file_id,
                        symbol_index=symbol_index,
                        label=label,
                        source_file=relative,
                        source_location=location(captured),
                        community=community,
                        relation="REFERENCES",
                    )

        if "assert" in source.decode("utf-8"):
            assertion_targets = [node for node in nodes.values() if node.type == "assertion" and node.source_file == relative]
            for target in assertion_targets:
                edges.append(Edge(file_id, target.id, "VALIDATES", "EXTRACTED", 1.0, relative))
```

Keep the existing return statement after this inserted loop.

- [ ] **Step 5: Run full graphify tests**

Run:

```bash
python3 -m unittest tests.graphify.test_graphify_jsonnet -v
```

Expected: PASS.

- [ ] **Step 6: Commit task 3**

Run:

```bash
git add tools/graphify_jsonnet.py tests/graphify/test_graphify_jsonnet.py
git commit -m "feat: add jsonnet graph relationships"
```

## Task 4: Refactor-oriented metrics, communities, and report

**Files:**
- Modify: `tools/graphify_jsonnet.py`
- Modify: `tests/graphify/test_graphify_jsonnet.py`

- [ ] **Step 1: Add failing report test**

Append this test method inside `GraphifyJsonnetTests`:

```python
    def test_report_contains_refactor_sections_and_low_confidence_review(self) -> None:
        graph = graphify_jsonnet.build_graph(FIXTURE_DIR)
        report = graphify_jsonnet.render_report(graph)

        self.assertIn("## Most Important Concepts / God Nodes", report)
        self.assertIn("## Key Architecture Communities", report)
        self.assertIn("## Surprising Cross-File or Cross-Module Connections", report)
        self.assertIn("## Important Rationale", report)
        self.assertIn("## Useful Questions", report)
        self.assertIn("## Ambiguous or Low-Confidence Relationships to Review", report)
        self.assertIn("Contract: caller names must stay stable", report)
```

- [ ] **Step 2: Run test to verify it fails or exposes minimal report**

Run:

```bash
python3 -m unittest tests.graphify.test_graphify_jsonnet.GraphifyJsonnetTests.test_report_contains_refactor_sections_and_low_confidence_review -v
```

Expected: FAIL until rationale and low-confidence sections are populated from graph content.

- [ ] **Step 3: Add metric helpers**

Add these functions before `render_report` in `tools/graphify_jsonnet.py`:

```python
def degree_counts(graph: dict[str, Any]) -> dict[str, int]:
    counts: dict[str, int] = {node["id"]: 0 for node in graph["nodes"]}
    for edge in graph["links"]:
        counts[edge["source"]] = counts.get(edge["source"], 0) + 1
        counts[edge["target"]] = counts.get(edge["target"], 0) + 1
    return counts


def node_by_id(graph: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {node["id"]: node for node in graph["nodes"]}


def top_nodes(graph: dict[str, Any], limit: int = 10) -> list[tuple[dict[str, Any], int]]:
    counts = degree_counts(graph)
    nodes = node_by_id(graph)
    ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:limit]
    return [(nodes[node_id], degree) for node_id, degree in ranked if node_id in nodes]


def community_counts(graph: dict[str, Any]) -> list[tuple[str, int]]:
    counts: dict[str, int] = {}
    for node in graph["nodes"]:
        counts[node.get("community", "unclustered")] = counts.get(node.get("community", "unclustered"), 0) + 1
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))


def cross_file_edges(graph: dict[str, Any], limit: int = 12) -> list[dict[str, Any]]:
    nodes = node_by_id(graph)
    result = []
    for edge in graph["links"]:
        source = nodes.get(edge["source"])
        target = nodes.get(edge["target"])
        if not source or not target:
            continue
        if source["source_file"] != target["source_file"]:
            result.append(edge | {"source_label": source["label"], "target_label": target["label"]})
    return result[:limit]


def rationale_nodes(graph: dict[str, Any], limit: int = 12) -> list[dict[str, Any]]:
    return [node for node in graph["nodes"] if node["type"] == "comment_rationale"][:limit]


def low_confidence_edges(graph: dict[str, Any], limit: int = 20) -> list[dict[str, Any]]:
    nodes = node_by_id(graph)
    result = []
    for edge in graph["links"]:
        if edge["confidence"] == "EXTRACTED" and edge["confidence_score"] >= 1.0:
            continue
        source = nodes.get(edge["source"], {"label": edge["source"]})
        target = nodes.get(edge["target"], {"label": edge["target"]})
        result.append(edge | {"source_label": source["label"], "target_label": target["label"]})
    return result[:limit]
```

- [ ] **Step 4: Replace `render_report` with contentful implementation**

Replace `render_report` in `tools/graphify_jsonnet.py` with:

```python
def render_report(graph: dict[str, Any]) -> str:
    lines = ["# Jsonnet Graph Report", ""]

    lines += ["## Most Important Concepts / God Nodes", ""]
    for node, degree in top_nodes(graph):
        lines.append(f"- `{node['label']}` ({node['type']}, degree {degree}) — `{node['source_file']}:{node['source_location']}`")
    if len(lines) == 3:
        lines.append("- No connected nodes found.")
    lines.append("")

    lines += ["## Key Architecture Communities", ""]
    for community, count in community_counts(graph)[:12]:
        lines.append(f"- `{community}`: {count} nodes")
    lines.append("")

    lines += ["## Surprising Cross-File or Cross-Module Connections", ""]
    for edge in cross_file_edges(graph):
        lines.append(
            f"- `{edge['source_label']}` --{edge['relation']}--> `{edge['target_label']}` "
            f"({edge['confidence']}, {edge['source_file']})"
        )
    lines.append("")

    lines += ["## Important Rationale", ""]
    rationales = rationale_nodes(graph)
    if rationales:
        for node in rationales:
            lines.append(f"- `{node['source_file']}:{node['source_location']}` — {node['label']}")
    else:
        lines.append("- No rationale comments matched the Jsonnet rationale keywords.")
    lines.append("")

    lines += ["## Useful Questions", ""]
    lines += [
        "- Which Jsonnet files are imported most often before a refactor?",
        "- Which modules define the most functions, fields, or validation assertions?",
        "- Which identifiers are ambiguous and need manual review before renaming?",
        "- Which workload-extension folders are coupled to shared generator libraries?",
        "- Which comments document contracts or invariants that refactoring must preserve?",
    ]
    lines.append("")

    lines += ["## Ambiguous or Low-Confidence Relationships to Review", ""]
    low_confidence = low_confidence_edges(graph)
    if low_confidence:
        for edge in low_confidence:
            lines.append(
                f"- `{edge['source_label']}` --{edge['relation']}--> `{edge['target_label']}` "
                f"({edge['confidence']}, score {edge['confidence_score']}, {edge['source_file']})"
            )
    else:
        lines.append("- No ambiguous or low-confidence edges detected.")
    lines.append("")

    return "\n".join(lines)
```

- [ ] **Step 5: Run full graphify tests**

Run:

```bash
python3 -m unittest tests.graphify.test_graphify_jsonnet -v
```

Expected: PASS.

- [ ] **Step 6: Commit task 4**

Run:

```bash
git add tools/graphify_jsonnet.py tests/graphify/test_graphify_jsonnet.py
git commit -m "feat: report jsonnet refactor hotspots"
```

## Task 5: Usable static HTML viewer

**Files:**
- Modify: `tools/graphify_jsonnet.py`
- Modify: `tests/graphify/test_graphify_jsonnet.py`

- [ ] **Step 1: Add failing HTML viewer test**

Append this test method inside `GraphifyJsonnetTests`:

```python
    def test_html_viewer_has_search_filters_and_neighbor_inspection(self) -> None:
        graph = graphify_jsonnet.build_graph(FIXTURE_DIR)
        html = graphify_jsonnet.render_html(graph)

        self.assertIn("id=\"search\"", html)
        self.assertIn("id=\"typeFilter\"", html)
        self.assertIn("id=\"confidenceFilter\"", html)
        self.assertIn("id=\"communityFilter\"", html)
        self.assertIn("neighbors", html)
        self.assertIn("graph-data", html)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest tests.graphify.test_graphify_jsonnet.GraphifyJsonnetTests.test_html_viewer_has_search_filters_and_neighbor_inspection -v
```

Expected: FAIL because current HTML only has search and details.

- [ ] **Step 3: Replace `render_html` with searchable/filterable viewer**

Replace `render_html` in `tools/graphify_jsonnet.py` with:

```python
def render_html(graph: dict[str, Any]) -> str:
    graph_json = json.dumps(graph).replace("</", "<\\/")
    return f"""<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\">
  <title>Jsonnet Graphify Viewer</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 0; display: grid; grid-template-columns: 380px 1fr; height: 100vh; }}
    aside {{ border-right: 1px solid #ddd; padding: 12px; overflow: auto; }}
    main {{ padding: 12px; overflow: auto; }}
    input, select {{ width: 100%; margin: 4px 0 10px; padding: 6px; }}
    .node {{ border: 1px solid #ddd; border-radius: 6px; padding: 6px; margin: 6px 0; cursor: pointer; }}
    .node:hover {{ background: #f6f8fa; }}
    .meta {{ color: #666; font-size: 12px; }}
    pre {{ white-space: pre-wrap; background: #f6f8fa; padding: 10px; border-radius: 6px; }}
  </style>
</head>
<body>
  <aside>
    <h1>Jsonnet Graphify Viewer</h1>
    <label>Search</label>
    <input id=\"search\" aria-label=\"Search label, id, or file\" />
    <label>Type</label>
    <select id=\"typeFilter\"><option value=\"\">All types</option></select>
    <label>Confidence</label>
    <select id=\"confidenceFilter\"><option value=\"\">All confidences</option></select>
    <label>Community</label>
    <select id=\"communityFilter\"><option value=\"\">All communities</option></select>
    <div id=\"nodeList\"></div>
  </aside>
  <main>
    <h2>Selection</h2>
    <pre id=\"details\">Select a node.</pre>
  </main>
  <script id=\"graph-data\" type=\"application/json\">{graph_json}</script>
  <script>
    const graph = JSON.parse(document.getElementById('graph-data').textContent);
    const byId = new Map(graph.nodes.map(n => [n.id, n]));
    const search = document.getElementById('search');
    const typeFilter = document.getElementById('typeFilter');
    const confidenceFilter = document.getElementById('confidenceFilter');
    const communityFilter = document.getElementById('communityFilter');
    const nodeList = document.getElementById('nodeList');
    const details = document.getElementById('details');

    function fillSelect(select, values) {{
      values.filter(Boolean).sort().forEach(value => {{
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      }});
    }}

    fillSelect(typeFilter, [...new Set(graph.nodes.map(n => n.type))]);
    fillSelect(confidenceFilter, [...new Set(graph.links.map(e => e.confidence))]);
    fillSelect(communityFilter, [...new Set(graph.nodes.map(n => n.community))]);

    function nodeHasConfidence(node, confidence) {{
      if (!confidence) return true;
      return graph.links.some(e => (e.source === node.id || e.target === node.id) && e.confidence === confidence);
    }}

    function neighbors(node) {{
      return graph.links
        .filter(e => e.source === node.id || e.target === node.id)
        .map(e => {{
          const otherId = e.source === node.id ? e.target : e.source;
          return {{ edge: e, node: byId.get(otherId) || {{ id: otherId, label: otherId }} }};
        }});
    }}

    function selectNode(node) {{
      const data = {{ node, neighbors: neighbors(node) }};
      details.textContent = JSON.stringify(data, null, 2);
    }}

    function render() {{
      const q = search.value.toLowerCase();
      const filtered = graph.nodes.filter(node => {{
        const haystack = `${{node.id}} ${{node.label}} ${{node.source_file}}`.toLowerCase();
        return haystack.includes(q)
          && (!typeFilter.value || node.type === typeFilter.value)
          && (!communityFilter.value || node.community === communityFilter.value)
          && nodeHasConfidence(node, confidenceFilter.value);
      }}).slice(0, 250);
      nodeList.innerHTML = '';
      filtered.forEach(node => {{
        const div = document.createElement('div');
        div.className = 'node';
        div.innerHTML = `<strong>${{node.label}}</strong><div class=\"meta\">${{node.type}} · ${{node.community}} · ${{node.source_file}}:${{node.source_location}}</div>`;
        div.addEventListener('click', () => selectNode(node));
        nodeList.appendChild(div);
      }});
    }}

    [search, typeFilter, confidenceFilter, communityFilter].forEach(el => el.addEventListener('input', render));
    render();
  </script>
</body>
</html>
"""
```

- [ ] **Step 4: Run full graphify tests**

Run:

```bash
python3 -m unittest tests.graphify.test_graphify_jsonnet -v
```

Expected: PASS.

- [ ] **Step 5: Commit task 5**

Run:

```bash
git add tools/graphify_jsonnet.py tests/graphify/test_graphify_jsonnet.py
git commit -m "feat: add static jsonnet graph viewer"
```

## Task 6: Generate repository graph artifacts and verify

**Files:**
- Modify: `tools/graphify_jsonnet.py`
- Create: `graphify-out/graph.json`
- Create: `graphify-out/GRAPH_REPORT.md`
- Create: `graphify-out/graph.html`

- [ ] **Step 1: Add CLI argument support for source/output paths without packaging a CLI**

Modify imports in `tools/graphify_jsonnet.py`:

```python
import argparse
```

Replace `main` with:

```python
def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a local Jsonnet project knowledge graph.")
    parser.add_argument("root", nargs="?", default="gen", help="Jsonnet source root to scan, default: gen")
    parser.add_argument("--out", default="graphify-out", help="Output directory, default: graphify-out")
    args = parser.parse_args()
    write_outputs(Path(args.root), Path(args.out))
```

- [ ] **Step 2: Run tests**

Run:

```bash
python3 -m unittest tests.graphify.test_graphify_jsonnet -v
```

Expected: PASS.

- [ ] **Step 3: Generate actual repository artifacts**

Run:

```bash
python3 tools/graphify_jsonnet.py gen --out graphify-out
```

Expected: exit code 0 and these files exist:

```text
graphify-out/graph.json
graphify-out/GRAPH_REPORT.md
graphify-out/graph.html
```

- [ ] **Step 4: Inspect output sizes and report headers**

Run:

```bash
python3 - <<'PY'
import json
from pathlib import Path
p = Path('graphify-out/graph.json')
g = json.loads(p.read_text())
print(len(g['nodes']), 'nodes')
print(len(g['links']), 'links')
print(Path('graphify-out/GRAPH_REPORT.md').read_text().splitlines()[:12])
PY
```

Expected: non-zero node and link counts, and report begins with `# Jsonnet Graph Report` and `## Most Important Concepts / God Nodes`.

- [ ] **Step 5: Run broader generator tests for regression safety**

Run:

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
```

Expected: PASS. If this is slow or fails for missing local `jsonnet`, record the exact failure and still report the focused graphify test result.

- [ ] **Step 6: Commit task 6**

Run:

```bash
git add tools/graphify_jsonnet.py graphify-out/graph.json graphify-out/GRAPH_REPORT.md graphify-out/graph.html
git commit -m "feat: generate jsonnet project graph"
```

## Self-Review

- Spec coverage:
  - Jsonnet-only scan is implemented by `iter_jsonnet_files` and default root `gen`.
  - Tree-sitter query extraction is implemented in Task 2.
  - Normalized node-link JSON is implemented in Tasks 1-3.
  - Confidence labels are implemented in Tasks 1 and 3.
  - Refactor-oriented report is implemented in Task 4.
  - Static HTML search/filter/neighbor viewer is implemented in Task 5.
  - Actual `graphify-out/` artifacts are generated in Task 6.
- Red-flag scan: no unfinished markers, vague implementation steps, or unspecified test steps remain.
- Type consistency: graph uses `nodes` and `links`; node and edge fields match the approved schema and tests.
