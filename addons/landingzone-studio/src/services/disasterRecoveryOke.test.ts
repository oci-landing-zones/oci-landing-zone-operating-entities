import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { newPlatform } from './platforms';
import { createDrDraft, createDrHubNetwork } from './disasterRecoveryDesign';
import { drOkeErrors, drOkePlatform } from './disasterRecoveryOke';

function design() {
  const model = emptyLzModel();
  const source = newPlatform('oke_simple', [], model.environments);
  source.environments = [model.environments[0].id];
  model.platforms = [source];
  const id = `platform:${source.id}:${model.environments[0].id}`;
  const draft = { ...createDrDraft(model), platformIds: [id], hubNetwork: createDrHubNetwork(model.network.hubKind) };
  return { model, source, id, draft };
}

describe('independent DR OKE configuration', () => {
  it('fits the DR /21 reservation with a manual subnet map and preserves Home', () => {
    const { model, source, draft, id } = design();
    const platform = drOkePlatform(model, draft, id)!;
    expect(platform.vcnCidr).toBe('10.0.216.0/21');
    expect(platform.okeParams?.clusterSize).toBeUndefined();
    expect(platform.subnets).toHaveLength(4);
    expect(drOkeErrors(model, draft, id, platform)).toEqual([]);
    expect(source.okeParams?.clusterSize).toBe('small');
  });

  it.each(['servicesCidr', 'podsCidr'] as const)('rejects %s overlapping the DR hub or Home networks', (key) => {
    const { model, draft, id } = design();
    const platform = drOkePlatform(model, draft, id)!;
    for (const cidr of ['10.0.192.0/21', '10.0.64.0/21']) {
      platform.okeParams![key] = cidr;
      expect(drOkeErrors(model, draft, id, platform).join(' ')).toContain('must not overlap another Home or DR VCN');
    }
  });

  it.each(['createFss', 'publicLoadBalancer'] as const)('requires Home IAM prerequisites for %s', (flag) => {
    const { model, source, draft, id } = design();
    const platform = drOkePlatform(model, draft, id)!;
    platform.okeParams![flag] = true;
    expect(drOkeErrors(model, draft, id, platform).join(' ')).toContain('apply its IAM prerequisites');
    source.okeParams![flag] = true;
    expect(drOkeErrors(model, draft, id, platform).join(' ')).not.toContain('apply its IAM prerequisites');
  });
});
