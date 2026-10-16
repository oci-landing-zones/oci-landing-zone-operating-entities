import { describe, expect, it } from 'vitest';
import { emptyLzModel, envNetworkDefaults, normalizeModel } from '../model/defaults';
import { newPlatform } from './platforms';
import { buildConfig, serializeConfig } from './lzConfig';
import { addExadataPlatform, exadataEntries, reconcileExadata, validateExadataModel } from './exadata';

describe('Exadata configuration', () => {
  it('pins new and saved ExaCS networks before another platform is removed', () => {
    const model = emptyLzModel();
    model.environments = [{ id: 'sandbox', name: 'sandbox', securityZone: false, network: envNetworkDefaults(0, 'sandbox') }];
    model.platforms = [newPlatform('custom', [], model.environments, [model.environments[0].network.vcnCidr])];
    model.exadata = addExadataPlatform(model, 'exacs', false);
    const cidr = exadataEntries(model).environments.sandbox.exacs.network!.vcn;
    expect(cidr).toBe('10.1.208.0/21');
    expect(model.exadata.exacs.environmentVcnCidrs.sandbox).toBe(cidr);
    const loaded = [true, false].map((enabled) => {
      const stored = structuredClone(model);
      stored.exadata.exacs.environmentVcnCidrs = {};
      stored.exadata.exacs.enabled = enabled;
      return normalizeModel(stored);
    });
    for (const design of [model, ...loaded]) {
      design.platforms = [];
      design.exadata = addExadataPlatform(design, 'exacs', false);
      expect(exadataEntries(design).environments.sandbox.exacs.network!.vcn).toBe(cidr);
    }
  });

  it('keeps a legacy EXACC hybrid design hybrid after its last selected environment is removed', () => {
    const model = emptyLzModel();
    model.exadata.exacc = { ...model.exadata.exacc, enabled: true, database: undefined,
      environments: ['environment-1'], service: 'vmc', notifications: { default: 'ops@example.com' } };
    model.environments = model.environments.slice(1);
    const next = reconcileExadata(model);
    expect(next.exadata.exacc.database).toBe('per_environment');
    expect(exadataEntries(next).shared.exacc.publication_components).toEqual({ infrastructure: true, database: false });
    expect(validateExadataModel(next)).toEqual(['EXACC needs at least one environment for dedicated placement.']);
  });

  it.each(['exacc', 'exacs'] as const)('cleans removed %s environment references without changing the remaining settings', (type) => {
    const model = emptyLzModel();
    model.exadata = addExadataPlatform(model, type, false);
    const design = model.exadata[type];
    design.service = 'both';
    design.notifications.default = 'ops@example.com';
    design.projectDb = { 'environment-1': ['project-1'], 'environment-2': ['project-1'] };
    design.notifications.projectEmails = { 'environment-1': 'old@example.com', 'environment-2': 'keep@example.com' };
    design.notifications.environmentInfraEmails = { ...design.notifications.projectEmails };
    design.notifications.environmentDbEmails = { ...design.notifications.projectEmails };
    model.exadata.exacs.environmentVcnCidrs = { 'environment-1': '10.200.0.0/21', 'environment-2': '10.201.0.0/21' };
    model.environments = model.environments.slice(1);
    const next = reconcileExadata(model);
    expect(next.exadata[type].environments).toEqual(['environment-2']);
    expect(next.exadata[type].projectDb).toEqual({ 'environment-2': ['project-1'] });
    for (const field of ['projectEmails', 'environmentInfraEmails', 'environmentDbEmails'] as const) {
      expect(next.exadata[type].notifications[field]).toEqual({ 'environment-2': 'keep@example.com' });
    }
    expect(next.exadata.exacs.environmentVcnCidrs).toEqual({ 'environment-2': '10.201.0.0/21' });
    expect(validateExadataModel(next)).toEqual([]);
    expect(model.exadata[type].environments).toHaveLength(2);
  });

  it.each(['exacc', 'exacs'] as const)('cleans %s project tiers after project removal or placement changes', (type) => {
    const model = emptyLzModel();
    model.exadata = addExadataPlatform(model, type, false);
    model.exadata[type].service = 'autonomous';
    model.exadata[type].notifications.default = 'ops@example.com';
    model.exadata[type].projectDb = { 'environment-1': ['project-1'], 'environment-2': ['project-1'] };
    model.projects[0].environments = ['environment-2'];
    const moved = reconcileExadata(model);
    expect(moved.exadata[type].projectDb).toEqual({ 'environment-2': ['project-1'] });
    expect(validateExadataModel(moved)).toEqual([]);
    const deleted = reconcileExadata({ ...moved, projects: [] });
    expect(deleted.exadata[type].projectDb).toEqual({});
    expect(validateExadataModel(deleted)).toEqual([]);
    moved.exadata[type].environments = ['environment-1'];
    expect(reconcileExadata(moved).exadata[type].projectDb).toEqual({});
  });

  it.each(['exacc', 'exacs'] as const)('rejects malformed %s recipients in each active notification scope', (type) => {
    const model = emptyLzModel();
    model.exadata = addExadataPlatform(model, type, true);
    const design = model.exadata[type];
    design.service = 'autonomous';
    design.notifications.default = 'garbage';
    expect(validateExadataModel(model).some((error) => error.includes('valid email'))).toBe(true);
    design.notifications = { useSingleRecipient: false, default: 'ignored', dbWorkloads: 'garbage', infraWorkloads: 'bad@',
      projectEmails: { 'environment-1': 'also-invalid' } };
    design.projectDb = { 'environment-1': ['project-1'] };
    expect(validateExadataModel(model).filter((error) => error.includes('valid email'))).toHaveLength(3);
    design.database = 'per_environment';
    design.environments = ['environment-1'];
    design.notifications.infraWorkloads = 'shared@example.com';
    design.notifications.projectEmails!['environment-1'] = 'projects@example.com';
    design.notifications.environmentInfraEmails = { 'environment-1': 'bad' };
    design.notifications.environmentDbEmails = { 'environment-1': 'also-bad' };
    expect(validateExadataModel(model).filter((error) => error.includes('valid email'))).toHaveLength(2);
    design.notifications.environmentInfraEmails['environment-1'] = 'infra@example.com';
    design.notifications.environmentDbEmails['environment-1'] = 'db@example.com';
    expect(validateExadataModel(model)).toEqual([]);
  });

  it.each(['exacc', 'exacs'] as const)('removes all %s scopes and restores a saved hybrid configuration when re-added', (type) => {
    const model = emptyLzModel();
    model.exadata = addExadataPlatform(model, type, true);
    model.exadata[type].database = 'per_environment';
    model.exadata[type].environments = ['environment-2'];
    model.exadata[type].service = 'vmc';
    model.exadata[type].notifications.default = 'ops@example.com';
    const before = buildConfig(model);
    model.exadata[type].enabled = false;
    const removed = buildConfig(model);
    expect(removed.shared_platforms[type]).toBeUndefined();
    for (const environment of Object.values(removed.environments)) expect(environment.platforms?.[type]).toBeUndefined();
    model.exadata = addExadataPlatform(model, type, true);
    expect(buildConfig(model)).toEqual(before);
  });

  it.each([
    { type: 'exacc', shared: true }, { type: 'exacc', shared: false },
    { type: 'exacs', shared: true }, { type: 'exacs', shared: false },
  ] as const)('adds $type with shared=$shared through its existing deployment contract', ({ type, shared }) => {
    const model = emptyLzModel();
    model.exadata = addExadataPlatform(model, type, shared);
    expect(model.exadata[type].enabled).toBe(true);
    const config = buildConfig(model);
    const entry = shared ? config.shared_platforms[type] : config.environments.prod.platforms[type];
    expect(entry.extension?.type).toBe(type);
    if (type === 'exacc') expect(entry.network).toBeUndefined();
    else expect(entry.network?.vcn).toBeTruthy();
    if (!shared) expect(model.exadata[type].environments).toEqual(model.environments.map((env) => env.id));
    expect(addExadataPlatform(model, type, !shared)).toBe(model.exadata);
  });

  it('retains saved Exadata settings and environment selections when added again', () => {
    const model = emptyLzModel();
    model.exadata.exacs.service = 'vmc';
    model.exadata.exacs.environments = ['environment-2'];
    model.exadata.exacs.notifications.default = 'dba@example.com';
    const next = addExadataPlatform(model, 'exacs', false);
    expect(next.exacs.service).toBe('vmc');
    expect(next.exacs.environments).toEqual(['environment-2']);
    expect(next.exacs.notifications.default).toBe('dba@example.com');
    expect(next.exacc).toBe(model.exadata.exacc);
    expect(model.exadata.exacs.enabled).toBe(false);
  });

  it('starts with both extensions disabled', () => {
    const model = emptyLzModel();
    expect(model.exadata.exacc.enabled).toBe(false);
    expect(model.exadata.exacs.enabled).toBe(false);
    expect(model.exadata.exacc.service).toBe('none');
    expect(model.exadata.exacs.service).toBe('none');
  });

  it('requires a database service after either extension is enabled', () => {
    const model = emptyLzModel();
    model.exadata.exacc.enabled = true;
    model.exadata.exacc.notifications.default = 'ops@example.com';
    expect(validateExadataModel(model)).toContain('EXACC needs at least one database service (VMC or AVMC).');
    model.exadata.exacc.service = 'vmc';
    expect(validateExadataModel(model)).toEqual([]);

    model.exadata.exacs.enabled = true;
    model.exadata.exacs.notifications.default = 'db@example.com';
    expect(validateExadataModel(model)).toContain('EXACS needs at least one database service (VMC or AVMC).');
    model.exadata.exacs.service = 'autonomous';
    expect(validateExadataModel(model)).toEqual([]);
  });

  it('omits EXACC project tiers until Autonomous is selected', () => {
    const model = emptyLzModel();
    model.exadata.exacc.enabled = true;
    model.exadata.exacc.projectDb = { 'environment-1': ['project-1'] };
    model.exadata.exacc.notifications.default = 'ops@example.com';
    expect(buildConfig(model).shared_platforms.exacc.extension?.params?.project_db_compartments).toBeUndefined();
    model.exadata.exacc.service = 'both';
    expect(buildConfig(model).shared_platforms.exacc.extension?.params?.project_db_compartments).toEqual({ prod: ['proj1'] });
    model.exadata.exacc.service = 'autonomous';
    expect(buildConfig(model).shared_platforms.exacc.extension?.params?.project_db_compartments).toEqual({ prod: ['proj1'] });
  });

  it.each([1, 2, 3] as const)('keeps only notification overrides used by EXACC UC%s', (useCase) => {
    const model = emptyLzModel();
    model.exadata.exacc.enabled = true;
    model.exadata.exacc.shared = useCase !== 3;
    model.exadata.exacc.database = useCase === 1 ? 'shared' : 'per_environment';
    model.exadata.exacc.environments = useCase === 1 ? [] : ['environment-1'];
    model.exadata.exacc.notifications = {
      useSingleRecipient: false,
      default: 'ops@example.com', dbWorkloads: 'dba@example.com', infraWorkloads: 'infra@example.com',
      environmentInfraEmails: { 'environment-1': 'env-infra@example.com' },
      environmentDbEmails: { 'environment-1': 'env-dba@example.com' },
    };
    const config = buildConfig(model);
    const params = useCase === 3
      ? config.environments.prod.platforms.exacc.extension?.params
      : config.shared_platforms.exacc.extension?.params;
    expect(params?.notification_emails).toEqual({
      default: [useCase === 3 ? 'env-infra@example.com' : useCase === 1 ? 'dba@example.com' : 'infra@example.com'],
      ...(useCase === 1 ? { db_workloads: ['dba@example.com'] } : {}),
      ...(useCase !== 3 ? { infra_workloads: ['infra@example.com'] } : {}),
      ...(useCase !== 1 ? {
        split_environment_topics: true,
        environment_infra: { prod: ['env-infra@example.com'] },
        environment_db: { prod: ['env-dba@example.com'] },
      } : {}),
    });
  });

  it('uses only the single EXACS recipient when the option is selected', () => {
    const model = emptyLzModel();
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.service = 'vmc';
    model.exadata.exacs.notifications = {
      useSingleRecipient: true, default: 'ops@example.com',
      dbWorkloads: 'previous-db@example.com', infraWorkloads: 'previous-infra@example.com',
    };
    expect(buildConfig(model).shared_platforms.exacs.extension?.params?.notification_emails).toEqual({ default: ['ops@example.com'] });
    expect(validateExadataModel(model)).toEqual([]);
  });

  it.each(['exacc', 'exacs'] as const)('keeps distinct %s project-topic recipients by environment', (type) => {
    const model = emptyLzModel();
    const design = model.exadata[type];
    design.enabled = true;
    design.service = 'autonomous';
    design.projectDb = { 'environment-1': ['project-1'], 'environment-2': ['project-1'] };
    design.notifications = {
      useSingleRecipient: false, default: '', dbWorkloads: 'dba@example.com', infraWorkloads: 'infra@example.com',
      projectEmails: { 'environment-1': 'prod-dba@example.com', 'environment-2': 'preprod-dba@example.com' },
    };
    expect(validateExadataModel(model)).toEqual([]);
    expect(buildConfig(model).shared_platforms[type].extension?.params?.notification_emails).toEqual({
      default: ['dba@example.com'], db_workloads: ['dba@example.com'], infra_workloads: ['infra@example.com'],
      projects_by_environment: { prod: ['prod-dba@example.com'], preprod: ['preprod-dba@example.com'] },
    });
  });

  it.each([['exacc', 2], ['exacs', 3]] as const)('routes %s UC%s infrastructure and DBA topics independently', (type, useCase) => {
    const model = emptyLzModel();
    const design = model.exadata[type];
    design.enabled = true;
    design.service = 'vmc';
    design.environments = ['environment-1', 'environment-2'];
    if (useCase === 2) model.exadata.exacc.database = 'per_environment';
    else {
      model.exadata.exacs.infrastructure = 'per_environment';
      model.exadata.exacs.database = 'per_environment';
    }
    design.notifications = {
      useSingleRecipient: false, default: '', infraWorkloads: 'infra@example.com',
      environmentInfraEmails: { 'environment-1': 'prod-infra@example.com', 'environment-2': 'preprod-infra@example.com' },
      environmentDbEmails: { 'environment-1': 'prod-dba@example.com', 'environment-2': 'preprod-dba@example.com' },
    };
    expect(validateExadataModel(model)).toEqual([]);
    const config = buildConfig(model);
    expect(config.environments.prod.platforms[type].extension?.params?.notification_emails).toMatchObject({
      split_environment_topics: true,
      environment_infra: { prod: ['prod-infra@example.com'], preprod: ['preprod-infra@example.com'] },
      environment_db: { prod: ['prod-dba@example.com'], preprod: ['preprod-dba@example.com'] },
    });
  });

  it('requires each generated project topic recipient and ignores uncreated UC1 topics', () => {
    const model = emptyLzModel();
    model.exadata.exacc.enabled = true;
    model.exadata.exacc.service = 'autonomous';
    model.exadata.exacc.notifications = {
      useSingleRecipient: false, default: '', dbWorkloads: 'dba@example.com', infraWorkloads: 'infra@example.com',
      projectEmails: {},
    };
    expect(validateExadataModel(model)).toEqual([]);
    model.exadata.exacc.projectDb = { 'environment-1': ['project-1'] };
    expect(validateExadataModel(model)).toContain('EXACC needs prod project-topic notification recipients.');
  });

  it('uses the single recipient for all project topics even when separate addresses are saved', () => {
    const model = emptyLzModel();
    model.exadata.exacc.enabled = true;
    model.exadata.exacc.service = 'autonomous';
    model.exadata.exacc.projectDb = { 'environment-1': ['project-1'] };
    model.exadata.exacc.notifications = {
      useSingleRecipient: true, default: 'all@example.com', dbWorkloads: 'dba@example.com',
      projectEmails: { 'environment-1': 'prod@example.com' },
    };
    expect(validateExadataModel(model)).toEqual([]);
    expect(buildConfig(model).shared_platforms.exacc.extension?.params?.notification_emails).toEqual({ default: ['all@example.com'] });
  });

  it('requires every visible EXACS recipient in separate-email mode', () => {
    const model = emptyLzModel();
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.service = 'vmc';
    model.exadata.exacs.notifications = { useSingleRecipient: false, default: '', dbWorkloads: 'db@example.com' };
    expect(validateExadataModel(model)).toContain('EXACS needs shared infrastructure notification recipients.');
    model.exadata.exacs.notifications.infraWorkloads = 'infra@example.com';
    expect(validateExadataModel(model)).toEqual([]);
    expect(buildConfig(model).shared_platforms.exacs.extension?.params?.notification_emails).toEqual({
      default: ['db@example.com'], db_workloads: ['db@example.com'], infra_workloads: ['infra@example.com'],
    });
  });

  it.each([1, 2, 3] as const)('maps EXACC UC%s to its published placement', (useCase) => {
    const model = emptyLzModel();
    model.exadata.exacc.enabled = true;
    model.exadata.exacc.shared = useCase !== 3;
    model.exadata.exacc.database = useCase === 1 ? 'shared' : 'per_environment';
    model.exadata.exacc.service = 'both';
    model.exadata.exacc.environments = useCase === 1 ? [] : ['environment-1'];
    model.exadata.exacc.projectDb = { 'environment-1': ['project-1'] };
    model.exadata.exacc.notifications.default = 'ops@example.com';
    const config = buildConfig(model);
    expect(!!config.shared_platforms.exacc).toBe(useCase !== 3);
    expect(!!config.environments.prod.platforms.exacc).toBe(useCase !== 1);
    if (useCase === 2) {
      expect(config.shared_platforms.exacc.publication_components).toEqual({ infrastructure: true, database: false });
      expect(config.environments.prod.platforms.exacc.publication_components).toEqual({ infrastructure: false, database: true });
    }
    if (useCase === 3) expect(config.environments.prod.platforms.exacc.publication_components).toEqual({ infrastructure: true, database: true });
    if (useCase === 1) expect(config.shared_platforms.exacc.extension?.params?.project_db_compartments).toEqual({ prod: ['proj1'] });
    else expect(config.environments.prod.platforms.exacc.extension?.params?.project_db_compartments).toEqual(['proj1']);
  });

  it.each([1, 2, 3] as const)('maps EXACS UC%s to its published placement', (useCase) => {
    const model = emptyLzModel();
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.service = 'vmc';
    model.exadata.exacs.infrastructure = useCase === 3 ? 'per_environment' : 'shared';
    model.exadata.exacs.database = useCase === 1 ? 'shared' : 'per_environment';
    model.exadata.exacs.environments = useCase === 1 ? [] : ['environment-1'];
    model.exadata.exacs.notifications.default = 'db@example.com';
    const config = buildConfig(model);
    expect(!!config.shared_platforms.exacs).toBe(useCase !== 3);
    expect(config.shared_platforms.exacs?.network).toEqual(useCase === 1 ? { vcn: '10.0.24.0/21' } : undefined);
    expect(!!config.environments.prod.platforms.exacs).toBe(useCase !== 1);
    if (useCase === 2) {
      expect(config.shared_platforms.exacs.publication_components).toEqual({ infrastructure: true, database: false });
      expect(config.environments.prod.platforms.exacs.publication_components).toEqual({ infrastructure: false, database: true });
    }
    if (useCase === 3) expect(config.environments.prod.platforms.exacs.publication_components).toEqual({ infrastructure: true, database: true });
    expect(validateExadataModel(model)).toEqual([]);
  });
  it('keeps EXACC networkless and emits shared plus environment project tiers', () => {
    const model = emptyLzModel();
    model.exadata.exacc = {
      enabled: true, shared: true, environments: ['environment-1'],
      projectDb: { 'environment-1': ['project-1'] },
      notifications: { default: 'ops@example.com' },
    };
    const config = buildConfig(model);
    expect(config.shared_platforms.exacc).toEqual({
      publication_components: { infrastructure: true, database: false },
      extension: { type: 'exacc', params: { notification_emails: { default: ['ops@example.com'], split_environment_topics: true } } },
    });
    expect(config.environments.prod.platforms.exacc).toEqual({
      publication_components: { infrastructure: false, database: true },
      extension: { type: 'exacc', params: {
        notification_emails: { default: ['ops@example.com'], split_environment_topics: true }, project_db_compartments: ['proj1'],
      } },
    });
    expect(serializeConfig(model, 3)).not.toContain("type: 'exacc'");
    expect(serializeConfig(model, 4)).toContain("type: 'exacc'");
  });

  it('emits shared EXACS infrastructure without a network and environment VMC networks', () => {
    const model = emptyLzModel();
    model.exadata.exacs = {
      enabled: true, infrastructure: 'shared', database: 'per_environment', service: 'vmc',
      environments: ['environment-1', 'environment-2'],
      sharedVcnCidr: '10.172.0.0/21',
      environmentVcnCidrs: { 'environment-1': '10.172.8.0/21', 'environment-2': '10.172.16.0/21' },
      projectDb: {}, notifications: { default: 'db@example.com' },
    };
    const config = buildConfig(model);
    expect(config.shared_platforms.exacs.network).toBeUndefined();
    expect(config.environments.prod.platforms.exacs.network).toEqual({ vcn: '10.172.8.0/21' });
    expect(config.environments.preprod.platforms.exacs.extension?.params?.project_db_compartments).toBeUndefined();
    expect(validateExadataModel(model)).toEqual([]);
  });

  it('maps shared Autonomous EXACS project tiers by environment', () => {
    const model = emptyLzModel();
    model.exadata.exacs = {
      enabled: true, infrastructure: 'shared', database: 'shared', service: 'autonomous',
      environments: ['environment-1', 'environment-2'],
      sharedVcnCidr: '10.172.0.0/21', environmentVcnCidrs: {},
      projectDb: { 'environment-1': ['project-1'] }, notifications: { default: 'db@example.com' },
    };
    const config = buildConfig(model);
    expect(config.shared_platforms.exacs.network).toEqual({ vcn: '10.172.0.0/21' });
    expect(config.shared_platforms.exacs.extension?.params?.project_db_compartments).toEqual({ prod: ['proj1'] });
    expect(config.environments.prod.platforms.exacs).toBeUndefined();
  });

  it('rejects missing recipients, stale projects and overlapping EXACS ranges', () => {
    const model = emptyLzModel();
    model.exadata.exacs = {
      enabled: true, infrastructure: 'shared', database: 'shared', service: 'autonomous',
      environments: ['environment-1'], sharedVcnCidr: '10.0.0.0/21', environmentVcnCidrs: {},
      projectDb: { 'environment-1': ['removed'] }, notifications: { default: '' },
    };
    expect(validateExadataModel(model).join(' ')).toMatch(/notification|recipient/i);
    expect(validateExadataModel(model).join(' ')).toMatch(/project/i);
    expect(validateExadataModel(model).join(' ')).toMatch(/overlap/i);
  });
});
