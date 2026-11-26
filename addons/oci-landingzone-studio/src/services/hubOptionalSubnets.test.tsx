import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyLzModel, normalizeModel } from '../model/defaults';
import { HUB_KINDS, hubKindDefaults } from './hubKinds';
import { buildConfig, serializeConfig } from './lzConfig';
import { importConfig } from './importConfig';
import { defaultBastion, validateBastion } from './bastion';
import HubNetworkStep from '../wizard/steps/HubNetworkStep';
import BastionSettings from '../wizard/steps/BastionSettings';
import { WizardProvider } from '../wizard/wizardContext';
import { generateNetwork } from '../generator/network';
import { generateOutputs } from '../generator/generate';
import { evaluate, setAssetLoader } from '../generator/jsonnetVm';
import { buildVirtualFs } from '../generator/virtualFs';

setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') }));
const optional = ['dns', 'mgmt', 'mon'];

async function normalizeSource(source: string) {
  const { files } = buildVirtualFs();
  const entry = 'optional_subnets_test.jsonnet';
  return evaluate(entry, { ...files, [entry]: "function(config) (import 'config.libsonnet').normalize(config).hub.network.subnets" }, { config: source });
}

describe.each(HUB_KINDS)('$label optional hub subnets', ({ id }) => {
  function modelWithout(names = optional) {
    const model = emptyLzModel();
    model.network = { hubKind: id, ...hubKindDefaults(id) };
    model.network.subnets = model.network.subnets.filter((subnet) => !names.includes(subnet.name));
    model.projects = [{ id: 'project-1', name: 'proj1', environments: 'all' }];
    return model;
  }

  it('offers removal for optional subnets and retains fixed names', () => {
    const model = modelWithout([]);
    const html = renderToStaticMarkup(<WizardProvider initialModel={model}><HubNetworkStep /></WizardProvider>);
    for (const name of optional) expect(html).toContain(`Delete subnet ${name}`);
    expect(html).not.toContain('Delete subnet lb');
    model.network.subnets.forEach((_, index) => {
      expect(html.match(new RegExp(`<input[^>]*aria-label="Subnet ${index + 1} name"[^>]*>`))?.[0]).toContain('readOnly=""');
    });
  });

  it('offers restoration and preserves omissions through save/export/import', async () => {
    const model = modelWithout();
    const html = renderToStaticMarkup(<WizardProvider initialModel={model}><HubNetworkStep /></WizardProvider>);
    for (const name of optional) expect(html).toContain(`Add ${name} subnet`);
    const config = buildConfig(model);
    expect(buildConfig(importConfig(config).model)).toEqual(config);
    expect(normalizeModel(JSON.parse(JSON.stringify(model))).network.subnets).toEqual(model.network.subnets);
    expect(await normalizeSource(serializeConfig(model))).toEqual(config.hub.network.subnets);
  });

  it('generates no removed subnet references or management SSH rules, retaining custom routing', async () => {
    const model = modelWithout();
    model.network.subnets.push({ name: 'tools', cidr: '10.0.6.0/24' });
    const network = await generateNetwork(model);
    const text = JSON.stringify(network);
    for (const name of optional) expect(text).not.toContain(`SN-FRA-LZ-HUB-${name.toUpperCase()}-KEY`);
    expect(text).not.toContain('Hub management subnet over SSH');
    expect(text).not.toContain('Bastion Service private endpoint');
    expect(text).toContain('SN-FRA-LZ-HUB-TOOLS-KEY');
    expect(text).toContain('RT-FRA-LZ-HUB-MGMT-KEY');
    expect(text).toContain('SL-FRA-LZ-HUB-MGMT-KEY');
  });

  it.each(optional)('can omit only %s without dropping the other optional subnets', async (name) => {
    const model = modelWithout([name]);
    expect(await normalizeSource(serializeConfig(model))).toEqual(buildConfig(model).hub.network.subnets);
  });

  it('retains the full historical layout when the subnet map is omitted', async () => {
    const model = modelWithout([]);
    const source = `{ hub: { kind: '${id}', network: { vcn: '10.0.0.0/21' } } }`;
    expect(await normalizeSource(source)).toEqual(buildConfig(model).hub.network.subnets);
  });
});

it('locks mgmt while Bastion is enabled and validates imported sources without it', async () => {
  const model = emptyLzModel();
  model.bastion = { ...defaultBastion(), enabled: true, clientCidrs: '203.0.113.10/32' };
  const html = renderToStaticMarkup(<WizardProvider initialModel={model}><HubNetworkStep /></WizardProvider>);
  expect(html).not.toContain('Delete subnet mgmt');
  expect(html).toContain('Delete subnet dns');
  expect(html).toContain('OCI Bastion requires the mgmt subnet');
  model.network.subnets = model.network.subnets.filter((subnet) => subnet.name !== 'mgmt');
  expect(validateBastion(model).join(' ')).toContain('mgmt');
  await expect(normalizeSource(serializeConfig(model))).rejects.toThrow(/Bastion requires.*mgmt/);
});

it('explains how to enable Bastion again when mgmt was removed', () => {
  const model = emptyLzModel();
  model.network.subnets = model.network.subnets.filter((subnet) => subnet.name !== 'mgmt');
  const html = renderToStaticMarkup(<WizardProvider initialModel={model}><BastionSettings /></WizardProvider>);
  expect(html).toContain('Restore the mgmt subnet in Hub Network before enabling OCI Bastion.');
  expect(html.match(/<button[^>]*role="switch"[^>]*>/)?.[0]).toContain('disabled=""');
});

it('omits removed subnets from the complete deployment, including flow logs', async () => {
  const model = emptyLzModel();
  model.foundation.costGovernance!.recipients = 'finops@customer.test';
  model.foundation.notifications!.default = 'ops@customer.test';
  model.network.subnets = model.network.subnets.filter((subnet) => !optional.includes(subnet.name));
  const outputs = await generateOutputs(model);
  const text = JSON.stringify(outputs.files);
  for (const name of optional) expect(text).not.toContain(`SN-FRA-LZ-HUB-${name.toUpperCase()}-KEY`);
  expect(text).toContain('SN-FRA-LZ-HUB-LB-KEY');
});

it('preserves the published default Hub A network', async () => {
  const { files } = buildVirtualFs();
  const entry = 'optional_subnets_default_test.jsonnet';
  const network = await evaluate(entry, { ...files,
    [entry]: "(import 'landing_zone.libsonnet')((import 'defaults.libsonnet').hub_a).network",
  });
  expect(network).toEqual(JSON.parse(readFileSync('../../blueprints/one-oe/runtime/one-stack/oneoe_network_hub_a.json', 'utf8')));
});
