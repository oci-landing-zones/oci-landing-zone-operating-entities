import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { buildConfig, serializeConfig } from './lzConfig';
import { validateExadataModel } from './exadata';

describe('Exadata configuration', () => {
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
      default: 'ops@example.com', dbWorkloads: 'dba@example.com',
      infraWorkloads: 'infra@example.com', projects: 'project@example.com',
    };
    const config = buildConfig(model);
    const params = useCase === 3
      ? config.environments.prod.platforms.exacc.extension?.params
      : config.shared_platforms.exacc.extension?.params;
    expect(params?.notification_emails).toEqual({
      default: [useCase === 3 ? 'project@example.com' : useCase === 1 ? 'dba@example.com' : 'infra@example.com'],
      ...(useCase === 1 ? { db_workloads: ['dba@example.com'] } : {}),
      ...(useCase !== 3 ? { infra_workloads: ['infra@example.com'] } : {}),
      ...(useCase !== 1 ? { projects: ['project@example.com'] } : {}),
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
    expect(config.shared_platforms.exacs?.network).toEqual(useCase === 1 ? { vcn: '10.172.0.0/21' } : undefined);
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
      extension: { type: 'exacc', params: { notification_emails: { default: ['ops@example.com'] } } },
    });
    expect(config.environments.prod.platforms.exacc).toEqual({
      publication_components: { infrastructure: false, database: true },
      extension: { type: 'exacc', params: {
        notification_emails: { default: ['ops@example.com'] }, project_db_compartments: ['proj1'],
      } },
    });
    expect(serializeConfig(model, 4)).not.toContain("type: 'exacc'");
    expect(serializeConfig(model, 5)).toContain("type: 'exacc'");
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
