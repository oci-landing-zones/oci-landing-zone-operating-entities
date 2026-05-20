# Jsonnet Graphify Mapper Design

## Goal

Create a local, file-based Graphify-style project mapper for the repository's Jsonnet source. The immediate goal is to produce graph artifacts that can later guide refactoring work, not to build a reusable SaaS app or polished CLI product.

## Scope

The mapper scans Jsonnet source only:

- `gen/**/*.libsonnet`
- `gen/**/*.jsonnet`

It writes all generated artifacts under `graphify-out/`:

- `graphify-out/graph.json`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.html`

No source code is sent to an LLM. Documentation, PDFs, images, and transcripts are out of scope for this Jsonnet-focused pass.

## Approach

Implement a small helper script at `tools/graphify_jsonnet.py`. The script uses tree-sitter queries where possible to extract Jsonnet structure deterministically. Lightweight text processing is acceptable only for comments and source-location formatting when tree-sitter does not expose that information conveniently.

The script is a generation helper, not a packaged CLI. It can be rerun locally to refresh `graphify-out/`.

## Graph Schema

### Nodes

Each node includes:

- `id`
- `label`
- `type`
- `source_file`
- `source_location`
- optional `community`

Node types:

- `file`
- `module`
- `import`
- `local`
- `function`
- `object_field`
- `assertion`
- `comment_rationale`

### Edges

Each edge includes:

- `source`
- `target`
- `relation`
- `confidence`
- `confidence_score`
- `source_file`

Edge relations:

- `IMPORTS`
- `DEFINES`
- `CONTAINS`
- `REFERENCES`
- `CALLS`
- `VALIDATES`
- `CONFIGURES`
- `RELATED_BY_PATH`

Confidence labels:

- `EXTRACTED`: directly matched from parsed source
- `INFERRED`: derived from path, naming, or community structure
- `AMBIGUOUS`: unresolved or repeated identifier that needs human review

## Extraction Details

The extractor should capture:

- file/module nodes for each Jsonnet file
- import paths and import relationships
- local bindings
- function-like definitions and calls
- object fields and nested object field paths where practical
- assertions and validation-related nodes
- comments that appear to contain design rationale, warnings, constraints, or contract notes
- identifier references that can be linked confidently or marked ambiguous

## Refactor-Oriented Reporting

`GRAPH_REPORT.md` should emphasize refactoring usefulness:

- most connected concepts and modules
- highly imported or highly referenced files
- large modules with many definitions
- repeated names across files that may indicate duplicated concepts or ambiguity
- cross-folder and cross-extension links
- validation/config/render coupling
- important rationale from comments
- ambiguous or low-confidence relationships to review before refactoring
- useful questions the graph can answer

## HTML Viewer

`graph.html` is a static local file. It loads embedded graph data or `graph.json` and provides:

- search by label/path
- filters by node type
- filters by confidence and community
- clickable nodes with neighbor inspection

The viewer should be usable, not polished.

## Testing

Add focused tests around the extraction and graph schema using small Jsonnet fixtures. Tests should verify:

- imports create `IMPORTS` edges
- locals/functions/fields create expected nodes
- direct matches use `EXTRACTED`
- unresolved or repeated references can be marked `AMBIGUOUS`
- outputs satisfy the required node and edge fields

## Non-Goals

- no SaaS app
- no auth, accounts, billing, or database
- no general multi-language parser in this pass
- no LLM extraction in this pass
- no full Jsonnet semantic evaluator
- no perfect type or scope resolver
