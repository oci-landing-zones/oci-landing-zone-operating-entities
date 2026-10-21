import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyLzModel } from '../model/defaults';
import { newPlatform, newSharedPlatform } from '../services/platforms';
import DisasterRecoverySourceDetails, { DisasterRecoverySharedInfrastructureDetails } from './DisasterRecoverySourceDetails';

describe('DR source configuration details', () => {
  it.each(['key', 'vcnCidr'] as const)('can review a saved draft with a missing shared platform %s', (field) => {
    const model = emptyLzModel();
    const platform = newSharedPlatform('custom', []);
    platform[field] = '';
    model.sharedPlatforms = [platform];
    const html = renderToStaticMarkup(<DisasterRecoverySourceDetails name="Draft" model={model} sourceLabel="Saved Landing Zone" />);
    expect(html).toContain('Incomplete platform');
    expect(html).toContain('Shared platforms (1)');
  });
  it('uses the same collapsible OCVS network and cluster sections as DR', () => {
    const model = emptyLzModel();
    model.sharedPlatforms = [newSharedPlatform('ocvs', [])];
    const html = renderToStaticMarkup(<DisasterRecoverySourceDetails name="Source" model={model} sourceLabel="Saved Landing Zone" part="platforms" />);
    expect(html).toContain('Network configuration');
    expect(html.indexOf('Subnets in this VCN')).toBeLessThan(html.indexOf('OCVS cluster configuration'));
    expect(html).toContain('>OCVS cluster configuration</summary>');
    expect(html).toContain('SDDC name');
    expect(html).toContain('Availability domain');
    expect(html).not.toContain('<input');
    expect(html).toMatch(/<details[^>]*aria-label="Home OCVS management cluster settings"[^>]*><summary/);
  });
  it('shows the selected design and foundation without exposing editable controls', () => {
    const model = emptyLzModel();
    model.foundation.description = 'Finance <production>';
    const html = renderToStaticMarkup(<DisasterRecoverySourceDetails name="Finance baseline" model={model} sourceLabel="Saved Landing Zone" />);
    expect(html).toContain('Finance baseline');
    expect(html).toContain('Finance &lt;production&gt;');
    expect(html).toContain('eu-frankfurt-1');
    expect(html).toContain('oc1');
    expect(html).toContain('10.0.0.0/21');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<select');
  });

  it('shows actual per-environment platform networks and scoped project membership', () => {
    const model = emptyLzModel();
    model.projects = [{ id: 'finance', name: 'finance-api', environments: [model.environments[0].id] }];
    const platform = newPlatform('oke_simple', [], model.environments);
    platform.overrides = { [model.environments[1].id]: { vcnCidr: '10.8.0.0/20' } };
    model.platforms = [platform];
    const html = renderToStaticMarkup(<DisasterRecoverySourceDetails name="Test" model={model} sourceLabel="config.jsonnet" />);
    expect(html).toContain('10.8.0.0/20');
    expect(html).toContain('10.8.0.0/21');
    expect(html).toContain('Kubernetes version');
    expect(html.match(/finance-api/g)).toHaveLength(1);
  });

  it('distinguishes infrastructure-only Exadata from network-producing scopes', () => {
    const model = emptyLzModel();
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.database = 'per_environment';
    model.exadata.exacs.service = 'vmc';
    model.exadata.exacs.environments = [model.environments[0].id];
    model.exadata.exacs.environmentVcnCidrs[model.environments[0].id] = '10.12.0.0/21';
    const html = renderToStaticMarkup(<DisasterRecoverySourceDetails name="Hybrid" model={model} sourceLabel="Saved Landing Zone" />);
    expect(html).toContain('10.12.0.0/21');
    expect(html).toContain('Infrastructure only');
    expect(html).toContain('EXACS · Prod VMC');
    const platforms = renderToStaticMarkup(<DisasterRecoverySourceDetails name="Hybrid" model={model} sourceLabel="Saved Landing Zone" part="platforms" />);
    expect(platforms.indexOf('Shared platforms')).toBeLessThan(platforms.indexOf('Environment platforms'));
    expect(platforms).not.toContain('>Platforms</h5>');
    expect(platforms).not.toContain('Notification recipients');
    expect(platforms).toContain('>EXACS · Infrastructure only</summary>');
    expect(platforms).toContain('cmp-lz-shared-exacs-infra');
    expect(platforms).toContain('>EXACS · Prod VMC</summary>');
    expect(platforms).toContain('Infrastructure compartment');
    expect(platforms).toContain('Network compartment');
    expect(platforms).toContain('cmp-lz-prod-network');
    const observability = renderToStaticMarkup(<DisasterRecoverySourceDetails name="Hybrid" model={model} sourceLabel="Saved Landing Zone" part="notifications" />);
    expect(observability).toContain('Platform notification recipients');
    expect(observability).toContain('EXACS · Shared');
    expect(observability).toContain(`EXACS · ${model.environments[0].name}`);
    const inherited = renderToStaticMarkup(<DisasterRecoverySharedInfrastructureDetails model={model} />);
    expect(inherited).toContain('>EXACS · Infrastructure only</summary>');
    expect(inherited).toContain('cmp-lz-shared-exacs</dd>');
    expect(inherited).toContain('cmp-lz-shared-exacs-infra</dd>');
    expect(inherited).not.toContain('<input');
    expect(inherited).not.toContain('Notification recipients');
  });
});
