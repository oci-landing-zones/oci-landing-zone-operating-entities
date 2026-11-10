import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyLzModel } from '../../model/defaults';
import { addExadataPlatform } from '../../services/exadata';
import { WizardProvider } from '../wizardContext';
import ExadataStep from './ExadataStep';

describe.each(['exacc', 'exacs'] as const)('%s placement fields', (type) => {
  it('uses one notification email by default and omits the Include checkbox', () => {
    const model = emptyLzModel();
    model.exadata = addExadataPlatform(model, type, true);
    const markup = renderToStaticMarkup(<WizardProvider initialModel={model}><ExadataStep type={type} placement="shared" /></WizardProvider>);
    expect(model.exadata[type].notifications.useSingleRecipient).toBe(true);
    expect(markup).toMatch(/<input type="checkbox"[^>]*checked=""\/>Use the same recipients for all topics/);
    expect(markup).not.toContain(`Include ${type.toUpperCase()} in this landing zone`);
    expect(markup).toContain('Notification emails *');
    expect(markup).not.toContain('Shared DBA team emails');
  });

  it('preserves an explicitly selected per-topic notification mode', () => {
    const model = emptyLzModel();
    model.exadata = addExadataPlatform(model, type, true);
    model.exadata[type].notifications.useSingleRecipient = false;
    model.exadata[type].notifications.infraWorkloads = 'infra@example.com';
    const markup = renderToStaticMarkup(<WizardProvider initialModel={model}><ExadataStep type={type} placement="shared" /></WizardProvider>);
    expect(markup).toContain('Shared infrastructure team emails');
    expect(markup).toContain('infra@example.com');
    expect(markup).not.toMatch(/<input type="checkbox"[^>]*checked=""\/>Use the same recipients for all topics/);
  });

  it('fixes shared infrastructure while allowing shared or dedicated VMCs', () => {
    const model = emptyLzModel();
    model.exadata = addExadataPlatform(model, type, true);
    const markup = renderToStaticMarkup(<WizardProvider initialModel={model}><ExadataStep type={type} placement="shared" /></WizardProvider>);
    expect(markup).not.toContain(`<select id="${type}-infrastructure"`);
    expect(markup).not.toContain(`<input id="${type}-infrastructure"`);
    expect(markup).toContain('>Shared across environments</span>');
    expect(markup).toContain(`<select id="${type}-database"`);
    expect(markup).toContain('value="shared"');
    expect(markup).toContain('value="per_environment"');
    expect(markup).toContain('Database services');
    if (type === 'exacs') expect(markup).toContain('Shared AVMC/VMC VCN CIDR');
  });

  it('shows dedicated environment infrastructure and VMC placement as plain text', () => {
    const model = emptyLzModel();
    model.exadata = addExadataPlatform(model, type, false);
    const markup = renderToStaticMarkup(<WizardProvider initialModel={model}><ExadataStep type={type} placement="environment" /></WizardProvider>);
    for (const field of ['infrastructure', 'database']) {
      expect(markup).not.toContain(`<select id="${type}-${field}"`);
      expect(markup).not.toContain(`<input id="${type}-${field}"`);
    }
    expect(markup.match(/>Dedicated per environment<\/span>/g)).toHaveLength(2);
    expect(markup).toContain('Database services');
    expect(markup).toContain('Environments with');
  });

  it('identifies the shared infrastructure behind a linked environment platform', () => {
    const model = emptyLzModel();
    model.exadata = addExadataPlatform(model, type, true);
    model.exadata[type].database = 'per_environment';
    model.exadata[type].environments = ['environment-1'];
    const markup = renderToStaticMarkup(<WizardProvider initialModel={model}><ExadataStep type={type} placement="environment" /></WizardProvider>);
    expect(markup).toContain('Infrastructure source');
    expect(markup).not.toContain('>Shared across environments</span>');
    expect(markup).toContain('Infrastructure is managed in Shared Platforms.');
    expect(markup).not.toContain(`<select id="${type}-database"`);
    expect(markup).not.toContain(`<input id="${type}-database"`);
    expect(markup).toContain('>Dedicated per environment</span>');
  });

  it('keeps hybrid infrastructure fields in Shared Platforms and database fields in Environment Platforms', () => {
    const model = emptyLzModel();
    model.exadata = addExadataPlatform(model, type, true);
    const design = model.exadata[type];
    design.database = 'per_environment';
    design.environments = ['environment-1'];
    design.service = 'both';
    design.projectDb = { 'environment-1': ['project-1'] };
    design.notifications.useSingleRecipient = false;
    const shared = renderToStaticMarkup(<WizardProvider initialModel={model}><ExadataStep type={type} placement="shared" /></WizardProvider>);
    const environment = renderToStaticMarkup(<WizardProvider initialModel={model}><ExadataStep type={type} placement="environment" /></WizardProvider>);
    expect(shared).toContain('Shared infrastructure team emails');
    expect(shared).toContain(`<select id="${type}-database"`);
    for (const field of ['Database services', 'Environments with', 'Autonomous database project tiers', 'prod DBA team emails', 'prod Infrastructure team emails', 'prod Autonomous project DBA emails', 'VCN CIDR']) {
      expect(shared).not.toContain(field);
    }
    for (const field of ['Database services', 'Environments with', 'Autonomous database project tiers', 'prod DBA team emails', 'prod Infrastructure team emails', 'prod Autonomous project DBA emails']) {
      expect(environment).toContain(field);
    }
    expect(environment).not.toContain('Shared infrastructure team emails');
    expect(environment).not.toContain('Use the same recipients for all topics');
    expect(environment).not.toContain(`<select id="${type}-database"`);
    if (type === 'exacs') expect(environment).toContain('prod AVMC/VMC VCN CIDR');
    else expect(environment).not.toContain('VCN CIDR');
  });

  it('shows the shared notification email as text in a linked environment platform', () => {
    const model = emptyLzModel();
    model.exadata = addExadataPlatform(model, type, true);
    model.exadata[type].database = 'per_environment';
    model.exadata[type].environments = ['environment-1'];
    model.exadata[type].notifications.default = 'ops@example.com';
    const markup = renderToStaticMarkup(<WizardProvider initialModel={model}><ExadataStep type={type} placement="environment" /></WizardProvider>);
    expect(markup).toContain('ops@example.com');
    expect(markup).toContain('Shared Platforms');
    expect(markup).not.toContain(`<input id="${type}-default"`);
    expect(markup).not.toContain('Use the same recipients for all topics');
  });
});
