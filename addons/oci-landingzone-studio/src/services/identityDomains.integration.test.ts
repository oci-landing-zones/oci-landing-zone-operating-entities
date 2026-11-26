import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { generateOutputs } from '../generator/generate';
import { generatePreview } from '../generator/preview';
import { evaluate, setAssetLoader } from '../generator/jsonnetVm';
import { buildVirtualFs } from '../generator/virtualFs';
import { buildConfig } from './lzConfig';
import { importConfig } from './importConfig';
import { syncDrEnvironments } from './linkedDr';
import { defaultBastion } from './bastion';
import { newPlatform } from './platforms';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') })));

describe('editable common identity domain', () => {
  it('updates domain references across core, OKE, ExaCC, ExaCS and OCVS profiles', async () => {
    const fixture = readFileSync('../../tests/gen/testdata/direct/pass/identity_domain_custom_name.jsonnet', 'utf8').replaceAll("import 'gen/", "import '");
    const entry = 'identity_domain_fixture.jsonnet';
    await expect(evaluate(entry, { ...buildVirtualFs().files, [entry]: fixture })).resolves.toEqual({ verified: true });
  }, 60000);

  it('renames the generated domain, core/OKE/Bastion policies and Vault grants with stable logical keys', async () => {
    const model = emptyLzModel();
    Object.assign(model.foundation, { cisLevel: 2, identityDomainName: 'customer.domain-01', tenancyHomeRegion: 'eu-frankfurt-1' });
    model.foundation.notifications!.default = 'ops@customer.test';
    model.foundation.costGovernance!.recipients = 'finops@customer.test';
    model.platforms = [newPlatform('oke_simple', [], model.environments)];
    model.bastion = { ...defaultBastion(), enabled: true, clientCidrs: '203.0.113.10/32' };
    const generated = await generateOutputs(model);
    const iam = JSON.parse(generated.files['iam.json']);
    expect(iam.identity_domains_configuration.identity_domains['COMMON-DOMAIN'].display_name).toBe('customer.domain-01');
    expect(iam.identity_domain_groups_configuration.default_identity_domain_id).toBe('COMMON-DOMAIN');
    expect(generated.files['iam.json']).not.toContain("'id_lz_common'/");
    const policies = Object.values(iam.policies_configuration.supplied_policies) as { statements: string[] }[];
    const statements = policies.flatMap((policy) => policy.statements);
    expect(statements.some((statement) => statement.includes("'customer.domain-01'/'grp-lz-prod-oke-admins'"))).toBe(true);
    expect(statements.some((statement) => statement.includes("'customer.domain-01'/") && statement.includes('manage bastion-session'))).toBe(true);
    const keys = JSON.parse(generated.files['security_cis2.json']).vaults_configuration.keys;
    expect(keys['KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY'].group_grantees).toEqual(["'customer.domain-01'/'grp-lz-security-admin'"]);
    const preview = await generatePreview(model);
    expect(preview.inventory.groups.find((group) => group.id === 'identitydomain:COMMON-DOMAIN')?.items[0].name).toBe('customer.domain-01');
    expect(importConfig(buildConfig(model)).model.foundation.identityDomainName).toBe('customer.domain-01');
    const regional = structuredClone(model);
    Object.assign(regional.foundation, { stackScope: 'regional', region: 'eu-amsterdam-1', regionShortName: 'ams', identityDomainName: 'outdated' });
    expect(syncDrEnvironments(regional, model).foundation.identityDomainName).toBe('customer.domain-01');
  }, 60000);

  it.each(['', "invalid'name", 'a'.repeat(101)])('rejects invalid domain names before emitting policies: %j', async (identityDomainName) => {
    const model = emptyLzModel();
    model.foundation.identityDomainName = identityDomainName;
    await expect(generatePreview(model)).rejects.toThrow('identity_domain_name');
  }, 60000);
});
