# go-jsonnet WASM runtime

This directory is Studio's maintained browser Jsonnet runtime. It evaluates the
repository's canonical `gen/` tree entirely in the browser and exposes
`jsonnet_evaluate_snippet` through the Go WebAssembly bridge.

## Why the wrapper exists

The stock go-jsonnet browser importer creates a new `jsonnet.Contents` value on
each lookup and reports the unresolved import string as the file identity. That
does not satisfy go-jsonnet's importer contract for a graph containing repeated
imports or files with the same relative name in different directories.

`main.go` changes only that boundary. Its in-memory importer:

- resolves each import to a canonical virtual path;
- caches one `jsonnet.Contents` instance per canonical path; and
- otherwise delegates parsing and evaluation to go-jsonnet.

The importer regression and full-generator parity coverage live in
`src/generator/generate.test.ts`.

## Pinned runtime

| Component | Version |
| --- | --- |
| Go toolchain | `go1.25.4` |
| go-jsonnet | `v0.22.0` |
| Binaryen `wasm-opt` | `131.0.0` |

`go.mod` pins both. `wasm_exec.js` must always be copied from that exact Go
toolchain; a shim from another Go version is not supported.

`libjsonnet.wasm` is generated and ignored by Git; it must never be committed or
stored with Git LFS. `wasm_exec.js` remains committed because it is the matching
JavaScript compatibility shim rather than a compiled binary.

## Deliberate rebuild procedure

Install the addon dependencies, then generate the optimized runtime locally:

```bash
cd addons/landingzone-studio
npm install
npm run build:wasm
```

The build uses the stripped Go linker (`-s -w`), removes local paths and build
metadata, then runs Binaryen `wasm-opt -Oz`. The script verifies the generated
WASM and matching Go shim against `SHA256SUMS`. If an intentional source or
toolchain change alters the output, review it and update the checksum explicitly.

`npm run build:wasm` is intentionally separate from `npm run build`; no binary
is built or committed implicitly. Run it once after cloning and whenever
`main.go`, `go.mod`, `go.sum`, Go, or Binaryen changes. A rebuild is complete only
when the importer regression and generator parity tests pass.

Third-party components and their licenses are recorded under
`public/third-party/go-jsonnet/`. Vite copies that directory into every
production build so the notices accompany the distributed runtime.
