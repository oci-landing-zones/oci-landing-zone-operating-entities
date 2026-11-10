import type { LzModel } from '../model/types';
import { serializeConfig } from '../services/lzConfig';
import { evaluate } from './jsonnetVm';
import { buildVirtualFs } from './virtualFs';

/** Evaluate only the canonical network artifact, without unrelated deployment outputs. */
export async function generateNetwork(model: LzModel): Promise<unknown> {
  const { files } = buildVirtualFs();
  const entry = 'studio_network.jsonnet';
  return evaluate(entry, {
    ...files,
    [entry]: "function(config) (import 'landing_zone.libsonnet')(config).network",
  }, { config: serializeConfig(model) });
}
