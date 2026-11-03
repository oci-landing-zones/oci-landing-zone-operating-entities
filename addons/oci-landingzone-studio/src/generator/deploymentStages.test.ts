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

const cases = [false, true].flatMap((regional) => ([1, 2] as const).flatMap((cis) =>
  (['hub_b', 'hub_c'] as const).flatMap((hub) => [false, true].map((oke) => ({ regional, cis, hub, oke }))),
));

describe('canonical deployment file sets', () => {
  it.each(cases)('keeps each root family unique for $regional/$cis/$hub/$oke', async ({ regional, cis, hub, oke }) => {
    const model = emptyLzModel();
    model.foundation.cisLevel = cis;
    if (regional) Object.assign(model.foundation, { stackScope: 'regional', region: 'eu-amsterdam-1', regionShortName: 'ams', homeRegion: 'eu-frankfurt-1' });
    model.network = { hubKind: hub, ...hubKindDefaults(hub) };
    if (oke) model.platforms = [newPlatform('oke_simple', [])];
    const result = await generateOutputs(model);
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
