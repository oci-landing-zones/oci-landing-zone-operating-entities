import { readFileSync } from 'node:fs';
import { beforeAll, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { hubKindDefaults } from '../services/hubKinds';
import { newPlatform, newSharedPlatform } from '../services/platforms';
import { generateOutputs } from './generate';
import { setAssetLoader } from './jsonnetVm';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') })));
it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('%s creates spoke NAT only for Hub E', async (hubKind) => {
  const model = emptyLzModel();
  model.foundation.costGovernance!.recipients = 'finops@example.com';
  model.foundation.notifications!.default = 'ops@example.com';
  model.network = { hubKind, ...hubKindDefaults(hubKind) };
  model.platforms = [newPlatform('oke_simple', [], model.environments), newPlatform('custom', [], model.environments)];
  model.sharedPlatforms = [newSharedPlatform('custom', [])];
  const out = await generateOutputs(model);
  const categories = JSON.parse(out.files['network.json']).network_configuration.network_configuration_categories;
  const vcns = Object.values(categories).flatMap((category) => Object.entries((category as { vcns?: Record<string, { vcn_specific_gateways?: { nat_gateways?: Record<string, unknown> } }> }).vcns ?? {}));
  const spokes = vcns.filter(([key]) => !key.endsWith('-HUB-KEY'));
  expect(spokes).toHaveLength(7);
  for (const [key, vcn] of spokes) {
    expect(Object.keys(vcn.vcn_specific_gateways?.nat_gateways ?? {}).length > 0, key).toBe(hubKind === 'hub_e');
  }
}, 60_000);
