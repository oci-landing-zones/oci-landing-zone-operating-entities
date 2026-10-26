import { readFileSync } from 'node:fs';
import { generateNetwork } from '../generator/network';
import { setAssetLoader } from '../generator/jsonnetVm';
import type { LzModel } from '../model/types';
import { serializeConfig } from './lzConfig';
import { buildRouteTables } from './routeTables';

setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') }));
const snapshots = new Map<string, Promise<unknown>>();

export async function generatedRouteTables(model: LzModel) {
  const key = serializeConfig(model);
  if (!snapshots.has(key)) snapshots.set(key, generateNetwork(model));
  return buildRouteTables(model, await snapshots.get(key)!);
}
