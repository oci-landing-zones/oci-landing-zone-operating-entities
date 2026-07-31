/**
 * jsonnetVm — a shared go-jsonnet WebAssembly VM.
 *
 * The engine is the cached-importer go-jsonnet build under `3rd/go-jsonnet`. It is
 * ~8 MB raw / ~2 MB gzipped. App bootstrap starts loading it immediately without
 * awaiting it, and generation reuses the resulting boot promise.
 *
 * Assets come from an injectable loader: the browser fetches them, and the test
 * suite hands over a Node loader. That keeps `node:fs` out of the browser bundle
 * without any bundler escape hatches.
 */

import wasmExecJs from '../../3rd/go-jsonnet/wasm_exec.js?raw';
import wasmUrl from '../../3rd/go-jsonnet/libjsonnet.wasm?url';

/** `jsonnet_evaluate_snippet(filename, code, files, extStrs, extCodes, tlaStrs, tlaCodes)` */
type EvaluateSnippet = (
  filename: string,
  code: string,
  files: Record<string, string>,
  extStrs: Record<string, string>,
  extCodes: Record<string, string>,
  tlaStrs: Record<string, string>,
  tlaCodes: Record<string, string>,
) => Promise<string>;

interface GoRuntime {
  importObject: WebAssembly.Imports;
  run(instance: WebAssembly.Instance): Promise<void>;
}

declare global {
  var Go: (new () => GoRuntime) | undefined;
  var jsonnet_evaluate_snippet: EvaluateSnippet | undefined;
}

export interface JsonnetAssets {
  /** Source of Go's `wasm_exec.js` shim; evaluated to install `globalThis.Go`. */
  wasmExecJs: string;
  /** The compiled `libjsonnet.wasm` bytes. */
  wasmBinary: BufferSource;
}

/** Load the runtime assets emitted by Vite from `3rd/go-jsonnet`. */
async function browserAssets(): Promise<JsonnetAssets> {
  const wasmRes = await fetch(wasmUrl);
  if (!wasmRes.ok) {
    throw new Error(`Could not load the jsonnet engine from ${wasmUrl} (${wasmRes.status})`);
  }
  return { wasmExecJs, wasmBinary: await wasmRes.arrayBuffer() };
}

let loadAssets: () => Promise<JsonnetAssets> = browserAssets;

/** Override where the engine is read from. Used by the test suite. */
export function setAssetLoader(loader: () => Promise<JsonnetAssets>): void {
  loadAssets = loader;
  booted = undefined;
}

let booted: Promise<EvaluateSnippet> | undefined;

async function boot(): Promise<EvaluateSnippet> {
  const { wasmExecJs, wasmBinary } = await loadAssets();
  // wasm_exec.js is a classic script that assigns `globalThis.Go`. Indirect eval
  // runs it in global scope in both the browser and Node.
  (0, eval)(wasmExecJs);
  const GoCtor = globalThis.Go;
  if (!GoCtor) throw new Error('wasm_exec.js did not install globalThis.Go');

  const go = new GoCtor();
  const { instance } = await WebAssembly.instantiate(wasmBinary, go.importObject);
  // The Go program registers its callbacks then parks on an empty channel, so
  // `run` never settles. Awaiting it would deadlock; we only need the side effect.
  void go.run(instance);

  const evaluate = globalThis.jsonnet_evaluate_snippet;
  if (!evaluate) throw new Error('libjsonnet.wasm did not register jsonnet_evaluate_snippet');
  return evaluate;
}

/** Boot once; concurrent callers share the same VM. */
export function jsonnetVm(): Promise<EvaluateSnippet> {
  booted ??= boot().catch((err) => {
    booted = undefined; // let a later attempt retry a transient fetch failure
    throw err;
  });
  return booted;
}

/**
 * Evaluate `entry` against `files` with the given top-level-argument code.
 * Returns the parsed JSON — for `landing_zone_multi.jsonnet` that is jsonnet's
 * `--multi` shape: an object whose keys are output filenames.
 */
export async function evaluate(
  entry: string,
  files: Record<string, string>,
  tlaCodes: Record<string, string> = {},
): Promise<unknown> {
  const evaluateSnippet = await jsonnetVm();
  const json = await evaluateSnippet(entry, files[entry], files, {}, {}, {}, tlaCodes);
  return JSON.parse(json);
}
