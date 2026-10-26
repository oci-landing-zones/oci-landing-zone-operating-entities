import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import type { GeneratedResourceInventory, ResourceKind } from '../services/generatedResources';
import { buildGraph } from './buildGraph';
import { absoluteNodeRects } from './flowGeometry';
import { resourceGroupLayout } from './resourceGroups';
import { generatePreview } from '../generator/preview';
import { buildRouteTables } from '../services/routeTables';
import { setAssetLoader } from '../generator/jsonnetVm';
import { hubKindDefaults } from '../services/hubKinds';
import { createFlowPlayback, flowHopMarkers, pointAtDistance } from './flowPlayback';
import { routeStructuralEdges } from './displayGeometry';
import { DIAGRAM_LAYOUT, minimumOwnerWidths } from './layoutPolicy';
import { generatorNames } from '../services/generatorNaming';

setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') }));

const kinds: ResourceKind[] = ['events', 'vault', 'scanning', 'notifications', 'flowlogs', 'securityrecipes'];
const inventory = (): GeneratedResourceInventory => ({
  compartments: [
    { key: 'root', name: 'OCI Tenancy' },
    { key: 'lz', name: 'cmp-landingzone', parentKey: 'root' },
    { key: 'security', name: 'cmp-lz-security', parentKey: 'lz' },
    { key: 'network', name: 'cmp-lz-network', parentKey: 'lz' },
    { key: 'prod', name: 'cmp-lz-prod', parentKey: 'lz' },
    { key: 'prod-security', name: 'actual-production-security', parentKey: 'prod' },
    { key: 'prod-logs', name: 'actual-production-log-owner', parentKey: 'prod-security' },
  ],
  groups: kinds.map((kind, index) => ({
    id: `generated-${kind}`, kind, compartmentKey: 'security',
    items: Array.from({ length: index + 1 }, (_, row) => ({ key: `${kind}-${row}`, name: `generated-${kind}-resource-${row}` })),
  })),
});

describe('generated diagram resource groups', () => {
  it.each([1, 5])('fits all generated groups in their real owner at step %s without overlapping', (step) => {
    const source = inventory();
    source.groups.reverse();
    const before = structuredClone(source);
    const graph = buildGraph(emptyLzModel(), step, {}, undefined, [], source);
    const rects = absoluteNodeRects(graph.nodes);
    const owner = rects.get('cmp-security')!;
    const groups = graph.nodes.filter((node) => node.kind === 'resourcegroup');
    expect(groups).toHaveLength(source.groups.length);
    for (const group of groups) {
      const generated = source.groups.find((item) => `resource-${item.id}` === group.id)!;
      expect(group.parentId).toBe(owner.id);
      expect(group.resourceItems).toEqual(generated.items);
      expect(group.width).toBeLessThanOrEqual(280);
      expect(group.height).toBe(resourceGroupLayout(generated.kind, generated.items, group.width).height);
      const box = rects.get(group.id)!;
      expect(box.x).toBeGreaterThanOrEqual(owner.x);
      expect(box.y).toBeGreaterThan(owner.y + 30);
      expect(box.x + box.width).toBeLessThanOrEqual(owner.x + owner.width);
      expect(box.y + box.height).toBeLessThan(owner.y + owner.height);
      for (const other of groups.filter((node) => node.id !== group.id)) {
        const b = rects.get(other.id)!;
        expect(box.x < b.x + b.width && box.x + box.width > b.x && box.y < b.y + b.height && box.y + box.height > b.y).toBe(false);
      }
    }
    const platform = rects.get('cmp-platform')!;
    expect(platform.y).toBeGreaterThanOrEqual(owner.y + owner.height);
    expect(new Set(groups.map((group) => group.x)).size).toBe(3);
    expect(groups.every((group) => group.width >= 180)).toBe(true);
    if (step === 5) {
      expect(groups.map((group) => group.resourceKind).sort()).toEqual([...kinds].sort());
      const baseline = buildGraph(emptyLzModel(), step);
      expect(graph.nodes.find((node) => node.id === 'hub-vcn')!.width).toBe(baseline.nodes.find((node) => node.id === 'hub-vcn')!.width);
      for (const id of ['cmp-network', 'cmp-security', 'cmp-platform']) expect(rects.get(id)!.width).toBe(owner.width);
    }
    expect(source).toEqual(before);
  });

  it.each([1, 5])('packs unequal resource heights without row-sized gaps at step %s, independently of inventory order', (step) => {
    const source = inventory();
    source.groups.forEach((group, index) => {
      group.items = Array.from({ length: index === 0 ? 20 : 1 }, (_, item) => ({ key: `${group.id}-${item}`, name: `resource-${item}` }));
    });
    const graph = buildGraph(emptyLzModel(), step, {}, undefined, [], source);
    const groups = graph.nodes.filter((node) => node.kind === 'resourcegroup');
    const columns = [...new Set(groups.map((node) => node.x))].map((x) => groups.filter((node) => node.x === x).sort((a, b) => a.y - b.y));
    expect(columns).toHaveLength(3);
    expect(new Set(columns.map((column) => column[0].y)).size).toBe(1);
    for (const column of columns) {
      for (let index = 1; index < column.length; index++) {
        expect(column[index].y - column[index - 1].y - column[index - 1].height).toBe(DIAGRAM_LAYOUT.gap);
      }
    }
    const owner = graph.nodes.find((node) => node.id === 'cmp-security')!;
    expect(owner.height).toBe(Math.max(...groups.map((node) => node.y + node.height)) + DIAGRAM_LAYOUT.padding);
    const byId = (nodes: typeof groups) => nodes.filter((node) => node.kind === 'resourcegroup' || node.id === 'cmp-security')
      .map(({ id, x, y, width, height }) => ({ id, x, y, width, height })).sort((a, b) => a.id.localeCompare(b.id));
    const reversed = buildGraph(emptyLzModel(), step, {}, undefined, [], { ...source, groups: [...source.groups].reverse() });
    expect(byId(reversed.nodes)).toEqual(byId(graph.nodes));
    for (const group of source.groups) expect(groups.find((node) => node.id === `resource-${group.id}`)?.resourceItems).toEqual(group.items);
  });

  it('materializes only actual owner ancestors and grows subsequent environments below them', () => {
    const source = inventory();
    source.groups = [{ id: 'nested', kind: 'flowlogs', compartmentKey: 'prod-logs', items: [{ key: 'log', name: 'actual-log-group' }] }];
    const model = emptyLzModel();
    const original = buildGraph(model, 5);
    const graph = buildGraph(model, 5, {}, undefined, [], source);
    const rects = absoluteNodeRects(graph.nodes);
    const security = rects.get('cmp-generated-prod-security')!;
    const logs = rects.get('cmp-generated-prod-logs')!;
    expect(security.node.label).toBe('actual-production-security');
    expect(security.node.parentId).toBe('cmp-env-0');
    expect(logs.node.label).toBe('actual-production-log-owner');
    expect(logs.node.parentId).toBe(security.id);
    expect(security.width).toBe(rects.get('cmp-env-0-network')!.width);
    expect(security.x).toBe(rects.get('cmp-env-0-network')!.x);
    expect(graph.nodes.find((node) => node.id === 'resource-nested')?.parentId).toBe(logs.id);
    for (const id of ['cmp-generated-prod-security', 'cmp-generated-prod-logs', 'resource-nested']) {
      const box = rects.get(id)!;
      const parent = rects.get(box.node.parentId!)!;
      expect(box.y + box.height).toBeLessThan(parent.y + parent.height);
      expect(box.x + box.width).toBeLessThan(parent.x + parent.width);
    }
    expect(rects.get('cmp-env-1')!.y).toBeGreaterThanOrEqual(rects.get('cmp-env-0')!.y + rects.get('cmp-env-0')!.height);
    expect(rects.get('cmp-env-1')!.y).toBeGreaterThan(absoluteNodeRects(original.nodes).get('cmp-env-1')!.y);
  });

  it('distinguishes equal compartment names by their actual generated ancestry', () => {
    const source = inventory();
    source.compartments.push({ key: 'shadow-prod', name: 'cmp-lz-prod', parentKey: 'security' });
    source.groups = [{ id: 'shadow-vault', kind: 'vault', compartmentKey: 'shadow-prod', items: [{ key: 'vault', name: 'actual-shadow-vault' }] }];
    const graph = buildGraph(emptyLzModel(), 5, {}, undefined, [], source);
    expect(graph.nodes.find((node) => node.id === 'resource-shadow-vault')?.parentId).toBe('cmp-generated-shadow-prod');
    expect(graph.nodes.find((node) => node.id === 'cmp-generated-shadow-prod')?.parentId).toBe('cmp-security');
    expect(graph.nodes.filter((node) => node.label === 'cmp-lz-prod')).toHaveLength(2);
    expect(graph.nodes.some((node) => node.kind === 'resourcegroup' && node.parentId === 'cmp-env-0')).toBe(false);
  });

  it.each([0, 1, 3, 6])('stacks %s measured Foundation environment cards in one compact column', (count) => {
    const model = emptyLzModel();
    model.environments = Array.from({ length: count }, (_, index) => ({
      id: `environment-${index}`, name: `workload${index}`, securityZone: false, network: envNetworkDefaults(index),
    }));
    const source = inventory();
    source.compartments = source.compartments.filter((compartment) => !compartment.key.startsWith('prod'));
    for (const [index, env] of model.environments.entries()) {
      source.compartments.push({ key: env.id, name: generatorNames.environmentCompartment(env.name), parentKey: 'lz' });
      source.compartments.push({ key: `${env.id}-services`, name: `actual-${env.name}-services`, parentKey: env.id });
      for (const kind of ['notifications', 'scanning'] as const) source.groups.push({
        id: `${env.id}-${kind}`, kind, compartmentKey: `${env.id}-services`,
        items: Array.from({ length: index + 1 }, (_, row) => ({ key: `${env.id}-${kind}-${row}`, name: `actual-${env.name}-${kind}-${row}` })),
      });
    }
    const graph = buildGraph(model, 1, {}, undefined, [], source);
    const rects = absoluteNodeRects(graph.nodes);
    const cards = model.environments.map((_, index) => rects.get(`cmp-env-${index}`)!);
    const widths = minimumOwnerWidths(source);
    for (const [index, card] of cards.entries()) {
      expect(card.width).toBeGreaterThanOrEqual(widths.get(model.environments[index].id)!);
      expect(card.width).toBeLessThan(rects.get('cmp-security')!.width);
      expect(card.node.compartmentScope).toBe('environment');
      for (const other of cards.filter((node) => node.id !== card.id)) {
        expect(card.x < other.x + other.width && card.x + card.width > other.x && card.y < other.y + other.height && card.y + card.height > other.y).toBe(false);
      }
    }
    expect(new Set(cards.map((card) => card.x)).size).toBe(count ? 1 : 0);
    expect(new Set(cards.map((card) => card.width)).size).toBe(count ? 1 : 0);
    if (count) expect(Math.min(...cards.map((card) => card.y))).toBe(rects.get('cmp-network')!.y);
    for (let index = 1; index < cards.length; index++) {
      expect(cards[index].y - cards[index - 1].y - cards[index - 1].height).toBe(DIAGRAM_LAYOUT.gap);
    }
    if (count > 1) expect(cards.at(-1)!.height).toBeGreaterThan(cards[0].height);
    for (const group of graph.nodes.filter((node) => node.kind === 'resourcegroup')) {
      expect(group.width).toBeGreaterThanOrEqual(DIAGRAM_LAYOUT.resourceMinWidth);
      const parent = rects.get(group.parentId!)!;
      expect(parent.node.compartmentScope).toBe(group.id.includes('environment-') ? 'environment' : 'shared');
    }
    const lz = rects.get('landingzone')!;
    const direct = graph.nodes.filter((node) => node.parentId === lz.id).map((node) => rects.get(node.id)!);
    expect(lz.width).toBe(Math.max(...direct.map((node) => node.x + node.width)) - lz.x + DIAGRAM_LAYOUT.padding);
    expect(lz.height).toBe(Math.max(...direct.map((node) => node.y + node.height)) - lz.y + DIAGRAM_LAYOUT.padding);
  });

  it.each(['complete', 'regional'] as const)('keeps tenancy and security resources visible without environments in %s designs', (scope) => {
    const model = emptyLzModel();
    model.foundation.stackScope = scope;
    model.environments = [];
    const source = inventory();
    source.groups = [source.groups[1], { id: 'tenancy-events', kind: 'events', compartmentKey: 'root', items: [{ key: 'event', name: 'actual-tenancy-event' }] }];
    const graph = buildGraph(model, 5, {}, undefined, [], source);
    expect(graph.nodes.filter((node) => node.kind === 'resourcegroup')).toHaveLength(2);
    expect(graph.nodes.find((node) => node.id === 'resource-tenancy-events')?.parentId).toBe('tenancy');
    const rects = absoluteNodeRects(graph.nodes);
    const lz = rects.get('landingzone')!;
    const events = rects.get('resource-tenancy-events')!;
    expect(events.y).toBeGreaterThanOrEqual(lz.y + lz.height);
    expect(events.y + events.height).toBeLessThan(rects.get('tenancy')!.y + rects.get('tenancy')!.height);
  });

  it('sizes long generated names dynamically and ignores empty groups', () => {
    const source = inventory();
    source.groups = [source.groups[0]];
    const small = buildGraph(emptyLzModel(), 1, {}, undefined, [], source);
    source.groups[0].items[0].name = 'actual-generated-resource-name-'.repeat(10);
    source.groups.push({ id: 'empty', kind: 'vault', compartmentKey: 'prod-logs', items: [] });
    const expanded = buildGraph(emptyLzModel(), 1, {}, undefined, [], source);
    expect(expanded.nodes.find((node) => node.kind === 'resourcegroup')!.height).toBeGreaterThan(small.nodes.find((node) => node.kind === 'resourcegroup')!.height);
    expect(expanded.nodes.some((node) => node.id === 'cmp-generated-prod-logs')).toBe(false);
    expect(expanded.nodes.some((node) => node.id === 'resource-empty')).toBe(false);
  });

  it.each([
    ['complete', true], ['regional', true], ['complete', false], ['regional', false],
  ] as const)('renders exactly the canonical %s resource inventory (no environments: %s)', async (scope, noEnvironments) => {
    const model = emptyLzModel();
    model.foundation.stackScope = scope;
    if (noEnvironments) model.environments = [];
    const preview = await generatePreview(model);
    const tables = buildRouteTables(model, preview.network);
    const graph = buildGraph(model, 5, { showFlows: true }, undefined, tables, preview.inventory);
    const rects = absoluteNodeRects(graph.nodes);
    const groups = graph.nodes.filter((node) => node.kind === 'resourcegroup');
    expect(groups).toHaveLength(preview.inventory.groups.filter((group) => group.items.length).length);
    expect(groups.length).toBeGreaterThan(0);
    for (const generated of preview.inventory.groups) {
      const group = rects.get(`resource-${generated.id}`)!;
      expect(group.node.resourceItems).toEqual(generated.items);
      const owner = rects.get(group.node.parentId!)!;
      expect(owner.node.label).toBe(preview.inventory.compartments.find((compartment) => compartment.key === generated.compartmentKey)!.name);
      expect(group.y + group.height).toBeLessThan(owner.y + owner.height);
      for (const other of graph.nodes.filter((node) => node.kind === 'routetable')) {
        const box = rects.get(other.id)!;
        expect(group.x < box.x + box.width && group.x + group.width > box.x && group.y < box.y + box.height && group.y + group.height > box.y, `${group.id} overlaps ${box.id}`).toBe(false);
      }
    }
  });

  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('keeps %s routing, packet stops and numbers aligned after generated resource growth', async (hub) => {
    const model = emptyLzModel();
    model.network = { hubKind: hub, ...hubKindDefaults(hub) };
    const preview = await generatePreview(model);
    const graph = buildGraph(model, 5, { allFlows: true }, undefined, buildRouteTables(model, preview.network), preview.inventory);
    expect(graph.flowErrors).toBeUndefined();
    expect(graph.nodes.some((node) => node.kind === 'resourcegroup')).toBe(true);
    const rects = absoluteNodeRects(graph.nodes);
    const canonical = new Map(routeStructuralEdges(graph.nodes, graph.edges.filter((edge) => !edge.waypoints)
      .map((edge) => ({ ...edge, points: undefined }))).map((edge) => [edge.id, edge.points]));
    const flows = graph.edges.filter((edge) => edge.waypoints);
    expect(flows.length).toBeGreaterThan(0);
    for (const edge of graph.edges.filter((edge) => !edge.waypoints)) {
      expect(edge.points, edge.id).toEqual(canonical.get(edge.id));
    }
    for (const resource of graph.nodes.filter((node) => node.kind === 'resourcegroup')) {
      const group = rects.get(resource.id)!;
      for (const table of graph.nodes.filter((node) => node.kind === 'routetable')) {
        const box = rects.get(table.id)!;
        expect(group.x < box.x + box.width && group.x + group.width > box.x && group.y < box.y + box.height && group.y + group.height > box.y,
          `${hub}: ${group.id} overlaps ${box.id}`).toBe(false);
      }
    }
    for (const flow of flows) {
      const playback = createFlowPlayback(flow);
      expect(playback.valid, flow.id).toBe(true);
      for (const marker of flowHopMarkers(flow)) {
        expect(pointAtDistance(flow.points!, playback.stops[marker.seq - 1].distance)).toEqual({ x: marker.x, y: marker.y });
        if (!flow.flowHops![marker.seq - 1].tableId) continue;
        const dot = rects.get(marker.anchorId!)!;
        expect(dot.node.kind).toBe('rtdot');
        expect({ x: marker.x, y: marker.y }).toEqual({ x: dot.x + dot.width / 2, y: dot.y + dot.height / 2 });
      }
    }
    const routed = flows.find((flow) => flow.waypoints!.some((node, index) =>
      node.startsWith('cmp-env-0-vcn-sn-') && flow.waypoints![index + 1] === 'attach-cmp-env-0'))!;
    expect(routed).toBeDefined();
    const connection = graph.edges.find((edge) => edge.source === 'cmp-env-0-vcn' && edge.target === 'attach-cmp-env-0')!;
    const physical = canonical.get(connection.id)!;
    expect(routed.points!.some((_, index) => physical.every((point, offset) =>
      point.x === routed.points![index + offset]?.x && point.y === routed.points![index + offset]?.y))).toBe(true);
  });
});
