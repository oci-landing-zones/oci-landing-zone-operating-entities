import { describe, expect, it } from 'vitest';
import { generatedFileScope } from './generatedFileScope';

describe('generated file scope', () => {
  it('identifies Home-owned IAM and governance as global', () => {
    expect(generatedFileScope('iam.json', JSON.stringify({ compartments_configuration: {}, policies_configuration: {} }), 'HR')).toBe('Global');
    expect(generatedFileScope('governance.json', JSON.stringify({ tags_configuration: {} }), 'HR')).toBe('Global');
  });
  it('distinguishes HR and DR regional networks and platform outputs', () => {
    expect(generatedFileScope('network.json', '{"network_configuration":{}}', 'HR')).toBe('Regional · Home region');
    expect(generatedFileScope('network.json', '{"network_configuration":{}}', 'DR')).toBe('Regional · DR');
    expect(generatedFileScope('ocvs.json', '{"ocvs_configuration":{}}', 'DR')).toBe('Regional · DR');
  });
  it('identifies mixed Home security without treating dependency keys as global resources', () => {
    expect(generatedFileScope('security_cis2.json', JSON.stringify({ cloud_guard_configuration: {}, scanning_configuration: {} }), 'HR')).toBe('Global + Home region');
    expect(generatedFileScope('security_cis2.json', JSON.stringify({ vaults_configuration: { keys: { key: { service_grantees: ['objectstorage-eu-frankfurt-1'] } } } }), 'HR')).toBe('Global + Home region');
    expect(generatedFileScope('security_cis2.json', JSON.stringify({ vaults_configuration: { default_compartment_id: 'CMP-LZ-SECURITY-KEY', keys: {} } }), 'DR')).toBe('Regional · DR');
  });
  it('labels source configuration separately from resource outputs', () => {
    expect(generatedFileScope('config.jsonnet', '{}', 'HR')).toBe('Source · Home region');
    expect(generatedFileScope('config.jsonnet', '{}', 'DR')).toBe('Source · DR');
  });
  it('does not guess when output cannot be classified', () => {
    expect(generatedFileScope('extension.json', '{"future_configuration":{}}', 'HR')).toBe('Scope not identified');
    expect(generatedFileScope('extension.json', 'invalid', 'DR')).toBe('Scope not identified');
  });
});
