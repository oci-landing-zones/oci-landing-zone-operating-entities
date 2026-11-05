import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { generatePreview } from '../generator/preview';
import { setAssetLoader } from '../generator/jsonnetVm';
import { emptyLzModel } from '../model/defaults';
import { hubKindDefaults } from '../services/hubKinds';
import { buildRouteTables } from '../services/routeTables';
import { allFlowIds, buildFlowTraces } from '../services/flowTrace';
import { generatedBastionTopology } from '../services/bastionTopology';
import { buildGraph } from './buildGraph';
import { toDrawioXml } from '../export/toDrawio';
import { complexHybridModel } from './complexHybrid.testSupport';
import { absoluteNodeRects } from './flowGeometry';
import { validateDiagramLayout } from './layoutQuality';
import { newPlatform, newSharedPlatform } from '../services/platforms';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') })));

const cases = (['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const).flatMap((hub) => ([1, 2] as const).map((cis) => ({ hub, cis })));

async function preview(hub = 'hub_e' as typeof cases[number]['hub'], cis: 1 | 2 = 2) {
  const model = emptyLzModel();
  model.foundation.cisLevel = cis;
  model.network = { hubKind: hub, ...hubKindDefaults(hub) };
  model.bastion = { enabled: true, clientCidrs: '203.0.113.10/32', maxSessionTtlInSeconds: 3600 };
  const result = await generatePreview(model);
  return { model, inventory: result.inventory, tables: buildRouteTables(model, result.network) };
}

describe('generated Bastion diagram and route preview', () => {
  it.each(cases)('ties the actual service to its management subnet for $hub CIS$cis', async ({ hub, cis }) => {
    const { model, inventory, tables } = await preview(hub, cis);
    const bastion = generatedBastionTopology(model, tables, inventory)!;
    expect(bastion).toBeDefined();
    const target = bastion.targets.find((target) => target.node === 'cmp-env-0-vcn-sn-0')!;
    const pick = `${target.scope}:bastion:${target.id}`;
    const graph = buildGraph(model, 5, { activeFlows: [pick] }, undefined, tables, inventory);
    const service = graph.nodes.find((node) => node.id === bastion.serviceNode)!;
    expect(service.parentId).toBe('cmp-security');
    expect(service.resourceItems?.map((item) => item.name)).toEqual(['bastionfralzhub']);
    expect(graph.nodes.filter((node) => node.resourceKind === 'bastion')).toHaveLength(1);
    expect(graph.nodes.find((node) => node.id === bastion.subnetNode)?.endpointName).toBeUndefined();
    expect(graph.edges.find((edge) => edge.id === 'bastion-private-endpoint')).toMatchObject({ source: bastion.serviceNode, target: bastion.subnetNode });
    const flow = graph.edges.find((edge) => edge.id === `flow-${pick}#0`)!;
    expect(flow?.waypoints?.slice(0, 3)).toEqual(['bastion-operator', bastion.serviceNode, bastion.subnetNode]);
    expect(flow.waypoints?.at(-1)).toBe('cmp-env-0-vcn-sn-0');
    expect(graph.flowErrors).toBeUndefined();
    const xml = toDrawioXml(graph);
    expect(xml).toContain('bastionfralzhub');
    expect(xml).toContain('bastion-private-endpoint');
    expect(xml).toContain('bastion-operator');
  }, 60_000);

  it('keeps Foundations ownership and network/flow step visibility separate', async () => {
    const { model, inventory, tables } = await preview();
    const foundation = buildGraph(model, 1, {}, undefined, tables, inventory);
    expect(foundation.nodes.filter((node) => node.resourceKind === 'bastion')).toHaveLength(1);
    expect(foundation.nodes.some((node) => node.id === 'bastion-operator')).toBe(false);
    const network = buildGraph(model, 2, { activeFlows: ['prod:bastion'] }, undefined, tables, inventory);
    expect(network.edges.some((edge) => edge.id === 'bastion-private-endpoint')).toBe(true);
    expect(network.edges.some((edge) => edge.waypoints)).toBe(false);
  });

  it('omits the service, operator and choices when disabled and rejects unknown generated bindings', async () => {
    const { model, inventory, tables } = await preview();
    const broken = structuredClone(inventory);
    broken.groups.find((group) => group.kind === 'bastion')!.items[0].subnetKey = 'UNKNOWN';
    expect(generatedBastionTopology(model, tables, broken)).toBeUndefined();
    model.bastion!.enabled = false;
    expect(generatedBastionTopology(model, tables, inventory)).toBeUndefined();
    expect(allFlowIds(model).some((id) => id.includes(':bastion'))).toBe(false);
    const disabled = await generatePreview(model);
    const graph = buildGraph(model, 5, {}, undefined, tables, disabled.inventory);
    expect(graph.nodes.some((node) => node.resourceKind === 'bastion' || node.id === 'bastion-operator')).toBe(false);
  });

  it('follows generated routes and leaves missing or wrong-way routes incomplete', async () => {
    const { model, inventory, tables } = await preview('hub_b');
    const bastion = generatedBastionTopology(model, tables, inventory)!;
    const web = bastion.targets.find((target) => target.node === 'cmp-env-0-vcn-sn-0')!;
    const db = bastion.targets.find((target) => target.node === 'cmp-env-0-vcn-sn-2')!;
    const pick = `${web.scope}:bastion:${web.id}`;
    const [trace] = buildFlowTraces(model, [pick], 'flow', tables, bastion);
    expect(trace.ok).toBe(true);
    expect(trace.note).toContain('NSG');
    expect(trace.note).toContain('documented');
    expect(allFlowIds(model, bastion).some((id) => id.startsWith('prod:bastion:'))).toBe(true);
    expect(buildFlowTraces(model, [`${db.scope}:bastion:${db.id}`], 'flow', tables, bastion)[0].segments.at(-1)?.to).toBe(db.node);
    const sourceTable = tables.find((table) => table.associations.some((binding) => binding.nodeId === bastion.subnetNode && binding.kind === 'subnet'))!;
    const nat = tables.flatMap((table) => table.rules).find((rule) => rule.nextHopKind === 'natgw')!;
    sourceTable.rules = [{ ...nat, destination: '0.0.0.0/0', matchCidr: '0.0.0.0/0' }];
    expect(buildFlowTraces(model, [pick], 'flow', tables, bastion)[0].ok).toBe(false);
    sourceTable.rules = [];
    const [missing] = buildFlowTraces(model, [pick], 'flow', tables, bastion);
    expect(missing.ok).toBe(false);
    expect(missing.hops.some((hop) => hop.inspected)).toBe(false);
    expect(missing.segments.at(-1)?.to).toBe(bastion.subnetNode);
  });

  it('keeps the operator clear of existing VPN/FastConnect equipment and exports a valid shared path', async () => {
    const model = complexHybridModel();
    model.bastion = { enabled: true, clientCidrs: '203.0.113.10/32', maxSessionTtlInSeconds: 3600 };
    const { inventory, network } = await generatePreview(model);
    const tables = buildRouteTables(model, network);
    const bastion = generatedBastionTopology(model, tables, inventory)!;
    const target = bastion.targets.find((target) => target.node === 'cmp-env-0-vcn-sn-0')!;
    const graph = buildGraph(model, 5, { activeFlows: [`${target.scope}:bastion:${target.id}`] }, undefined, tables, inventory);
    expect(graph.flowErrors).toBeUndefined();
    expect(validateDiagramLayout(graph, { inventory, routeTables: tables, showRouteTables: true })).toEqual([]);
    const rects = absoluteNodeRects(graph.nodes);
    const operator = rects.get('bastion-operator')!;
    for (const node of graph.nodes.filter((node) => !node.parentId && !['region', 'bastion-operator'].includes(node.id))) {
      const other = rects.get(node.id)!;
      expect(operator.y).toBeGreaterThanOrEqual(other.y + other.height);
    }
    expect(toDrawioXml(graph)).toContain('Bastion route preview');
  }, 60_000);

  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('reaches generated OKE and shared platform subnets without project networks in %s', async (hub) => {
    const model = emptyLzModel();
    model.network = { hubKind: hub, ...hubKindDefaults(hub) };
    model.bastion = { enabled: true, clientCidrs: '203.0.113.10/32', maxSessionTtlInSeconds: 3600 };
    model.environments.forEach((env) => { env.projectNetworkEnabled = false; });
    model.platforms = [newPlatform('oke_simple', [], model.environments)];
    model.sharedPlatforms = [newSharedPlatform('custom', [])];
    model.exadata.exacs = { ...model.exadata.exacs, enabled: true, service: 'vmc', notifications: { default: 'db@example.com' } };
    const { inventory, network } = await generatePreview(model);
    const tables = buildRouteTables(model, network);
    const bastion = generatedBastionTopology(model, tables, inventory)!;
    expect(bastion.targets.some((target) => target.node.startsWith('cmp-env-0-vcn-sn-'))).toBe(false);
    const targets = [bastion.targets.find((target) => target.node.startsWith('cmp-env-0-plat-0-sn-'))!,
      bastion.targets.find((target) => target.scope === '@shared' && target.label.includes('exacs'))!,
      bastion.targets.find((target) => target.scope === '@shared' && target.label.includes('core'))!];
    expect(targets.every(Boolean)).toBe(true);
    const picks = targets.map((target) => `${target.scope}:bastion:${target.id}`);
    const traces = buildFlowTraces(model, picks, 'flow', tables, bastion);
    expect(traces).toHaveLength(3);
    expect(traces.map((trace) => trace.ok)).toEqual([true, true, true]);
    expect(traces.map((trace) => trace.segments.at(-1)?.to)).toEqual(targets.map((target) => target.node));
    const graph = buildGraph(model, 5, { activeFlows: picks }, undefined, tables, inventory);
    expect(graph.flowErrors).toBeUndefined();
    expect(graph.edges.filter((edge) => edge.waypoints)).toHaveLength(3);
    const xml = toDrawioXml(graph);
    targets.forEach((target) => expect(xml).toContain(target.label));
    const attachment = tables.flatMap((table) => table.associations).find((binding) => binding.kind === 'drg-attachment' && binding.vcnNodeId === targets[0].node.split('-sn-')[0])!;
    attachment.vcnNodeId = 'unknown-vcn';
    expect(buildFlowTraces(model, [picks[0]], 'flow', tables, bastion)[0].ok).toBe(false);
  }, 60_000);

  it('does not invent an endpoint for ExaCC without a generated subnet', async () => {
    const model = emptyLzModel();
    model.environments.forEach((env) => { env.projectNetworkEnabled = false; });
    model.bastion = { enabled: true, clientCidrs: '203.0.113.10/32', maxSessionTtlInSeconds: 3600 };
    model.exadata.exacc = { ...model.exadata.exacc, enabled: true, shared: true, service: 'vmc', notifications: { default: 'db@example.com' } };
    const { inventory, network } = await generatePreview(model);
    const tables = buildRouteTables(model, network);
    const bastion = generatedBastionTopology(model, tables, inventory)!;
    expect(bastion.targets).toEqual([]);
    expect(allFlowIds(model, bastion)).toEqual([]);
    const graph = buildGraph(model, 5, { allFlows: true }, undefined, tables, inventory);
    expect(graph.edges.some((edge) => edge.id === 'bastion-private-endpoint')).toBe(true);
    expect(graph.edges.some((edge) => edge.waypoints)).toBe(false);
  });
});
