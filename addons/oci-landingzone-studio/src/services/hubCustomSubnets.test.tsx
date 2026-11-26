import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { HUB_KINDS, hubKindDefaults } from './hubKinds';
import { buildConfig, serializeConfig } from './lzConfig';
import { importConfig } from './importConfig';
import { generatedRouteTables } from './routingFixtures.testSupport';
import { buildGraphLayout } from '../diagram/buildGraph';
import { toDrawioXml } from '../export/toDrawio';
import HubNetworkStep from '../wizard/steps/HubNetworkStep';
import { WizardProvider } from '../wizard/wizardContext';

describe.each(HUB_KINDS)('$label custom subnets', ({ id }) => {
  const model = emptyLzModel();
  model.network = { hubKind: id, ...hubKindDefaults(id) };
  model.network.subnets.push({ name: 'tools', cidr: '10.0.6.0/24' });

  it('exports custom keys separately and preserves them on import', () => {
    const config = buildConfig(model);
    expect(config.hub.network.subnets).not.toHaveProperty('tools');
    expect(config.hub.network.custom_subnets).toEqual({ tools: '10.0.6.0/24' });
    expect(serializeConfig(model)).toContain('custom_subnets: {');
    expect(buildConfig(importConfig(config).model)).toEqual(config);
  });

  it('allows custom rows while retaining mandatory subnet protections', () => {
    const html = renderToStaticMarkup(<WizardProvider initialModel={model}><HubNetworkStep /></WizardProvider>);
    const index = model.network.subnets.length;
    const input = html.match(new RegExp(`<input[^>]*aria-label="Subnet ${index} name"[^>]*>`))?.[0];
    expect(input).toContain('value="tools"');
    expect(input).not.toContain('readOnly');
    expect(html).toContain('Delete subnet tools');
    expect(html).not.toContain('Delete subnet lb');
    expect(html).toContain('Delete subnet mgmt');
    expect(html).toContain('Private · Routing: mgmt · Security list: mgmt');
    expect(html).toContain('Add custom subnet');
  });

  it('keeps an invalid custom name recoverable without overwriting the required subnet', () => {
    const duplicate = structuredClone(model);
    duplicate.network.subnets.at(-1)!.name = 'mgmt';
    const html = renderToStaticMarkup(<WizardProvider initialModel={duplicate}><HubNetworkStep /></WizardProvider>);
    const input = html.match(new RegExp(`<input[^>]*aria-label="Subnet ${duplicate.network.subnets.length} name"[^>]*>`))?.[0];
    expect(input).not.toContain('readOnly');
    expect(html).toContain('Delete subnet mgmt');
    const config = buildConfig(duplicate);
    expect(config.hub.network.subnets.mgmt).toBe(model.network.subnets.find((subnet) => subnet.name === 'mgmt')!.cidr);
    expect(config.hub.network.custom_subnets?.mgmt).toBe('10.0.6.0/24');
  });

  it('shows the shared routing in the diagram and Draw.io export', () => {
    const graph = buildGraphLayout(model, 2);
    const subnet = graph.nodes.find((node) => node.label.startsWith('sn-fra-lz-hub-tools\n'));
    expect(subnet?.routingNote).toBe('Private · RT: mgmt');
    expect(subnet?.publicSubnet).not.toBe(true);
    expect(toDrawioXml(graph)).toContain('Private · RT: mgmt');
  });

  it('associates generated custom subnets with the actual MGMT route table', async () => {
    const tables = await generatedRouteTables(model);
    const mgmt = tables.find((table) => table.name === 'rt-fra-lz-hub-mgmt');
    const toolsIndex = model.network.subnets.length - 1;
    expect(mgmt?.associations.some((entry) => entry.nodeId === `hub-vcn-sn-${toolsIndex}`)).toBe(true);
  });
});
