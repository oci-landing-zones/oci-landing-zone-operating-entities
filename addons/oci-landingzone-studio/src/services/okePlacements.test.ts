import { describe, expect, it } from 'vitest';
import { emptyLzModel, normalizeModel } from '../model/defaults';
import { createOkeEntries, splitOkePlacements } from './okePlacements';
import { newPlatform, okeNetworkProfilePatch, applyPlatformPatch, platformEnvInstances } from './platforms';
import { buildConfig } from './lzConfig';
import { overlaps } from './cidr';

describe('independent OKE placements', () => {
  it.each([true, false])('preserves generated config and overrides while splitting saved entries (profile=%s)', (profile) => {
    const model = emptyLzModel();
    const oke = newPlatform('oke_simple', [], model.environments);
    if (!profile) {
      oke.okeParams!.clusterSize = undefined;
      oke.subnets = [{ name: 'workers', cidr: '10.0.82.0/23' }, { name: 'pods', cidr: '10.0.84.0/23' }];
    }
    oke.overrides = { [model.environments[1].id]: { vcnCidr: '10.20.0.0/20', ...(profile ? {} : { subnets: [{ name: 'workers', cidr: '10.20.2.0/23' }, { name: 'pods', cidr: '10.20.4.0/23' }] }) } };
    const custom = newPlatform('custom', [oke], model.environments);
    model.platforms = [oke, custom];
    const before = buildConfig(model);
    const split = splitOkePlacements(model);
    expect(buildConfig(split)).toEqual(before);
    expect(split.platforms).toHaveLength(3);
    expect(split.platforms[2]).toBe(custom);
    expect(split.platforms.slice(0, 2).map((p) => p.environments)).toEqual(model.environments.map((e) => [e.id]));
    expect(split.platforms[1].vcnCidr).toBe('10.20.0.0/20');
    expect(split.platforms[0].okeParams).not.toBe(split.platforms[1].okeParams);
    expect(splitOkePlacements(split)).toBe(split);
    expect(normalizeModel(model).platforms).toEqual(split.platforms);
  });

  it('creates independent cards and avoids occupied CIDRs, including another added batch', () => {
    const model = emptyLzModel();
    const occupied = [model.network.hubVcnCidr, ...model.environments.map((e) => e.network.vcnCidr)];
    const first = createOkeEntries(model, occupied, 'oke');
    expect(first.map((p) => p.environments)).toEqual(model.environments.map((e) => [e.id]));
    model.platforms = first;
    const allOccupied = [...occupied, ...first.map((p) => p.vcnCidr)];
    const second = createOkeEntries(model, allOccupied, 'ok2');
    expect(second).toHaveLength(2);
    for (const p of second) expect(allOccupied.some((cidr) => overlaps(p.vcnCidr, cidr))).toBe(false);
    expect(overlaps(second[0].vcnCidr, second[1].vcnCidr)).toBe(false);
    expect(new Set([...first, ...second].map((p) => p.id)).size).toBe(4);
    expect(createOkeEntries({ ...model, environments: [] }, [])).toEqual([]);
  });

  it('keeps a cluster network stable across environment reorder, profile changes and independent edits', () => {
    const model = emptyLzModel();
    model.platforms = createOkeEntries(model, []);
    const before = model.platforms[1];
    const reordered = [...model.environments].reverse();
    expect(platformEnvInstances(before, reordered)[0].vcnCidr).toBe(before.vcnCidr);
    const changed = applyPlatformPatch(before, okeNetworkProfilePatch(before, 'medium'), model.environments, model.platforms.map((p) => p.vcnCidr));
    expect(platformEnvInstances(changed, reordered)[0].vcnCidr).toBe(changed.vcnCidr);
    expect(changed.environments).toEqual(before.environments);
    expect(model.platforms[0].okeParams!.clusterSize).toBe('small');
    expect(splitOkePlacements({ ...model, environments: [...model.environments, { ...model.environments[0], id: 'extra', name: 'extra' }] }).platforms).toHaveLength(2);
  });
});
