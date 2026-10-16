import { describe, expect, it } from 'vitest';
import { deploymentStages, isCurrentOutputSet } from './outputNames';

describe('deploymentStages', () => {
  it('uses one network file in both operations while keeping staged controls separate', () => {
    const stages = deploymentStages([
      'iam.json', 'governance.json', 'network.json',
      'security_cis1_pre.json', 'security_cis1.json',
      'observability_cis1_pre.json', 'observability_cis1.json',
      'network_backends.json', 'oke_clusters.json',
    ]);
    expect([...stages[0].files].sort()).toEqual([
      'iam.json', 'governance.json', 'network.json',
      'security_cis1_pre.json', 'observability_cis1_pre.json',
    ].sort());
    expect([...stages[1].files].sort()).toEqual([
      'iam.json', 'governance.json', 'network.json',
      'security_cis1.json', 'observability_cis1.json', 'oke_clusters.json',
    ].sort());
  });
});

describe('isCurrentOutputSet', () => {
  it('accepts current outputs and requires regeneration after design or network-format changes', () => {
    const saved = { config: '{ cis_level: 2 }', files: { 'network.json': '{}' } };
    expect(isCurrentOutputSet(saved, saved.config)).toBe(true);
    expect(isCurrentOutputSet(saved, '{ cis_level: 1 }')).toBe(false);
    expect(isCurrentOutputSet({ ...saved, files: { ...saved.files, 'network_pre.json': '{}' } }, saved.config)).toBe(false);
  });
});
