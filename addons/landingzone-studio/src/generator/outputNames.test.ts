import { describe, expect, it } from 'vitest';
import { deploymentStages } from './outputNames';

describe('deploymentStages', () => {
  it('keeps pre and final root configuration families in separate ORM operations', () => {
    const stages = deploymentStages([
      'iam.json', 'governance.json', 'network_pre.json', 'network.json',
      'security_cis1_pre.json', 'security_cis1.json',
      'observability_cis1_pre.json', 'observability_cis1.json',
    ]);
    expect(stages[0].files).toEqual([
      'iam.json', 'governance.json', 'network_pre.json',
      'security_cis1_pre.json', 'observability_cis1_pre.json',
    ]);
    expect(stages[1].files).toEqual([
      'iam.json', 'governance.json', 'network.json',
      'security_cis1.json', 'observability_cis1.json',
    ]);
    expect(stages.every((stage) => !(stage.files.includes('network_pre.json') && stage.files.includes('network.json')))).toBe(true);
  });

  it('uses the final network in the initial Hub E operation and retains extension outputs for completion', () => {
    const stages = deploymentStages([
      'iam.json', 'governance.json', 'network.json',
      'security_cis1_pre.json', 'security_cis1.json',
      'observability_cis1_pre.json', 'observability_cis1.json',
      'oke.json',
    ]);
    expect(stages[0].files).toContain('network.json');
    expect(stages[1].files).toContain('oke.json');
  });

  it('does not put Hub C network_backends beside network.json', () => {
    const stages = deploymentStages(['iam.json', 'governance.json', 'network_pre.json', 'network.json', 'network_backends.json']);
    expect(stages.flatMap((stage) => stage.files)).not.toContain('network_backends.json');
  });
});
