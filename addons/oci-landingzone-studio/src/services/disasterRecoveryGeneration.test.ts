import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { setAssetLoader } from '../generator/jsonnetVm';
import { newPlatform } from './platforms';
import { emptyLzModel } from '../model/defaults';
import { createDrDraft, createDrHubNetwork } from './disasterRecoveryDesign';
import { buildDrFileConfigs, generateDrFileBundle } from './disasterRecoveryGeneration';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync(resolve('3rd/go-jsonnet/libjsonnet.wasm')) })));

function design() {
  const model = emptyLzModel();
  model.foundation.notifications = { useSingleRecipient: true, default: 'home@example.com', cloudguard: '', iam: '', network: '', security: '' };
  const draft = { ...createDrDraft(model), region: 'eu-amsterdam-1', regionConfirmed: true, hubAdded: true, hubNetwork: createDrHubNetwork(model.network.hubKind) };
  draft.notifications = { ...model.foundation.notifications, default: 'dr@example.com' };
  return { model, draft };
}

function vcnCidrs(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => key === 'cidr_blocks' && Array.isArray(child) ? child : vcnCidrs(child));
}

describe('DR file generation', () => {
  it('keeps Home complete and builds only selected regional networks with independent recipients', () => {
    const { model, draft } = design();
    const { home, dr } = buildDrFileConfigs(model, draft);
    expect(home).toMatchObject({ stack_scope: 'complete', dr_region: 'eu-amsterdam-1', region: 'eu-frankfurt-1' });
    expect(dr).toMatchObject({ stack_scope: 'regional', region: 'eu-amsterdam-1', region_short_name: 'ams', notification_emails: { default: ['dr@example.com'] } });
    expect(Object.keys(dr.environments)).toEqual(['prod']);
    expect(dr.environments.prod.project_network?.network.vcn).toBe('10.0.200.0/21');
    expect(home.environments.prod.project_network?.network.vcn).toBe('10.0.64.0/21');
    expect(model.foundation.notifications?.default).toBe('home@example.com');
  });

  it('exports a two-directory bundle from the real generator with no DR IAM or governance', async () => {
    const { model, draft } = design();
    const files = await generateDrFileBundle(model, draft);
    expect(files['Home/config.jsonnet']).toBeDefined();
    expect(files['DR/config.jsonnet']).toBeDefined();
    expect(files['Home/iam.json']).toBeDefined();
    expect(files['Home/governance.json']).toBeDefined();
    expect(files['DR/iam.json']).toBeUndefined();
    expect(files['DR/governance.json']).toBeUndefined();
    expect(files['DR/network.json']).toContain('10.0.200.0/21');
    expect(files['DR/network.json']).not.toContain('10.0.128.0/21');
    expect(files['DR/security_cis2.json']).not.toContain('cloud_guard_configuration');
    expect(files['DR/observability_cis2.json']).toContain('dr@example.com');
    expect(files['README.txt']).toContain('Home');
  }, 30000);

  it('includes selected EXACS networks, edited subnets and matched RPC peer keys', async () => {
    const { model, draft } = design();
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.database = 'per_environment';
    model.exadata.exacs.service = 'vmc';
    model.exadata.exacs.environments = model.environments.map((env) => env.id);
    model.exadata.exacs.notifications.default = 'exacs@example.com';
    const id = `extension:environment:${model.environments[0].id}:exacs`;
    draft.platformIds = ['extension:shared:exacs', id];
    draft.platformVcnCidrs = { [id]: '10.0.240.0/21' };
    draft.platformSubnets = { [id]: [{ name: 'db', cidr: '10.0.242.0/24' }, { name: 'backup', cidr: '10.0.243.0/24' }] };
    draft.rpcEnabled = true;
    const files = await generateDrFileBundle(model, draft);
    expect(files['DR/network.json']).toContain('10.0.240.0/21');
    expect(files['DR/network.json']).toContain('10.0.242.0/24');
    expect(vcnCidrs(JSON.parse(files['DR/network.json']))).not.toContain('10.0.168.0/21');
    expect(JSON.parse(files['DR/config.jsonnet']).environments.preprod).toBeUndefined();
    expect(files['DR/config.jsonnet']).toContain('RPC-FRA-LZ-HUB-DR-KEY');
    expect(files['Home/network.json']).toContain('RPC-FRA-LZ-HUB-DR-KEY');
    expect(files['DR/network.json']).toContain('"peer_key": "RPC-FRA-LZ-HUB-DR-KEY"');
    expect(JSON.parse(files['DR/config.jsonnet']).environments.prod.platforms.exacs.network.vcn).toBe('10.0.240.0/21');
  }, 30000);



  it('generates independently edited OKE DR cluster and manual /21 networking', async () => {
    const { model, draft } = design();
    const platform = newPlatform('oke_simple', [], model.environments);
    platform.environments = [model.environments[0].id];
    model.platforms = [platform];
    const id = `platform:${platform.id}:${model.environments[0].id}`;
    draft.platformIds = [id];
    draft.platformOkeParams = { [id]: { ...platform.okeParams!, clusterSize: undefined, servicesCidr: '172.30.0.0/16', workerBootVolumeSize: 80 } };
    const { home, dr } = buildDrFileConfigs(model, draft);
    const entry = dr.environments.prod.platforms[platform.key];
    expect(entry.network?.vcn).toBe('10.0.216.0/21');
    expect(entry.network?.subnets?.workers).toBe('10.0.218.0/23');
    expect(entry.extension?.params).toMatchObject({ worker_boot_volume_size: 80, services_cidr: '172.30.0.0/16' });
    expect(entry.extension?.params).not.toHaveProperty('cluster_size');
    expect(home.environments.prod.platforms[platform.key].network?.vcn).toBe('10.0.80.0/20');
    const files = await generateDrFileBundle(model, draft);
    expect(files['DR/network.json']).toContain('10.0.216.0/21');
    const okeFiles = Object.entries(files).filter(([name]) => name.startsWith('DR/') && name.includes('oke'));
    expect(okeFiles.length).toBeGreaterThan(0);
    expect(okeFiles.map(([, value]) => value).join('\n')).toContain('172.30.0.0/16');
    draft.platformOkeParams[id].servicesCidr = '10.0.216.0/21';
    expect(() => buildDrFileConfigs(model, draft)).toThrow(/service CIDR.*overlap/i);
  }, 30000);

  it('rejects incomplete or overlapping DR addressing before generating', () => {
    const { model, draft } = design();
    expect(() => buildDrFileConfigs(model, { ...draft, region: '' })).toThrow(/region/i);
    expect(() => buildDrFileConfigs(model, { ...draft, hubNetwork: { ...draft.hubNetwork, hubVcnCidr: '10.0.0.0/21' } })).toThrow(/overlap/i);
  });
});
