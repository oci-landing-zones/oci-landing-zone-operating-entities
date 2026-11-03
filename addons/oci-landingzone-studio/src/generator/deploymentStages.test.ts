import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { buildConfig } from '../services/lzConfig';
import { completionNetwork } from '../services/deployment';
import { hubKindDefaults } from '../services/hubKinds';
import { newPlatform } from '../services/platforms';
import { generateOutputs } from './generate';
import { setAssetLoader } from './jsonnetVm';
import { deploymentStages } from './outputNames';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync(resolve('3rd/go-jsonnet/libjsonnet.wasm')) })));

const cases = [
  { regional: false, cis: 2, hub: 'hub_c', oke: true },
  { regional: true, cis: 1, hub: 'hub_b', oke: false },
  { regional: false, cis: 1, hub: 'hub_b', oke: true },
  { regional: true, cis: 2, hub: 'hub_c', oke: false },
] as const;

describe('canonical deployment file sets', () => {
  it.each(cases)('keeps each root family unique for $regional/$cis/$hub/$oke', async ({ regional, cis, hub, oke }) => {
    const model = emptyLzModel();
    model.foundation.cisLevel = cis;
    if (regional) Object.assign(model.foundation, { stackScope: 'regional', region: 'eu-amsterdam-1', regionShortName: 'ams', homeRegion: 'eu-frankfurt-1' });
    model.network = { hubKind: hub, ...hubKindDefaults(hub) };
    if (oke) model.platforms = [newPlatform('oke_simple', [])];
    const result = await generateOutputs(model);
    expect(Object.keys(result.files).filter((file) => /^(security|observability)_cis/.test(file)).sort()).toEqual([
      `security_cis${cis}_pre.json`, `security_cis${cis}.json`,
      `observability_cis${cis}_pre.json`, `observability_cis${cis}.json`,
    ].sort());
    const stages = deploymentStages(Object.keys(result.files), completionNetwork(buildConfig(model)));
    for (const stage of stages) {
      const roots = stage.files.flatMap((file) => Object.keys(JSON.parse(result.files[file])));
      expect(new Set(roots).size).toBe(roots.length);
      expect(stage.files.includes('iam.json')).toBe(!regional);
      expect(stage.files.includes('governance.json')).toBe(!regional);
    }
    expect(stages[1].files.includes('oke_clusters.json')).toBe(oke);
    expect(stages[1].files.includes('oke_workers.json')).toBe(oke);
    expect(stages[1].files.includes('network_backends.json')).toBe(hub === 'hub_c');
  }, 60_000);
});
