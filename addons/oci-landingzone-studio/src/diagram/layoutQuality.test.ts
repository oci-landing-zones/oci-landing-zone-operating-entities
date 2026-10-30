import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import type { DiagramModel, DiagramOptions, HubKind, LzModel } from '../model/types';
import { generatePreview } from '../generator/preview';
import { setAssetLoader } from '../generator/jsonnetVm';
import { toDrawioXml } from '../export/toDrawio';
import { buildRouteTables } from '../services/routeTables';
import { hubKindDefaults } from '../services/hubKinds';
import { newPlatform, newSharedPlatform } from '../services/platforms';
import { buildGraphLayout as buildGraph } from './buildGraph';
import { attachmentLabelLayout, DIAGRAM_LAYOUT, drgCaptionBounds, minimumOwnerWidths } from './layoutPolicy';
import { physicalSharedSegments, structuralCrossings, structuralLineContacts, validateDiagramLayout } from './layoutQuality';
import { oracle } from '../theme';
import { routeStructuralEdges } from './displayGeometry';
import { absoluteNodeRects } from './flowGeometry';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') })));

function environmentCount(count: number) {
  const model = emptyLzModel();
  const occupied = [model.network.hubVcnCidr];
  model.environments = ['prod', 'preprod', 'dev', 'qa', 'stage', 'test'].slice(0, count).map((name, index) => {
    const network = envNetworkDefaults(index, name, occupied);
    occupied.push(network.vcnCidr);
    return { id: `environment-${index + 1}`, name, securityZone: index === 0, network };
  });
  if (!count) model.projects = [];
  return model;
}

async function generated(model: LzModel) {
  const preview = await generatePreview(model);
  return { inventory: preview.inventory, tables: buildRouteTables(model, preview.network) };
}

function physicalConnections(graph: DiagramModel): DiagramModel {
  const dots = new Set(graph.nodes.filter((node) => node.kind === 'rtdot').map((node) => node.id));
  return { ...graph, edges: graph.edges.filter((edge) => !dots.has(edge.source)) };
}

function expectLayout(graph: DiagramModel, context: Parameters<typeof validateDiagramLayout>[1], label: string) {
  expect(validateDiagramLayout(graph, context), label).toEqual([]);
  const xml = toDrawioXml(graph);
  for (const node of graph.nodes.filter((node) => node.kind === 'resourcegroup')) expect(xml, `${label} export ${node.id}`).toContain(`id="${node.id}"`);
  expect(xml).toContain('fillColor=#FAF8D6');
  if (graph.nodes.some((node) => node.compartmentScope === 'environment' && node.tone === 'yellow')) expect(xml).toContain('fillColor=#FCF9BD');
}

describe('shared diagram layout policy', () => {
  it('reserves up to three readable columns and propagates the largest populated child width', () => {
    const inventory = { compartments: [
      { key: 'root', name: 'root' }, { key: 'one', name: 'one', parentKey: 'root' }, { key: 'two', name: 'two', parentKey: 'root' },
      { key: 'empty', name: 'empty', parentKey: 'root' },
    ], groups: [
      ...(['events', 'vault', 'scanning', 'notifications'] as const).map((kind) => ({ id: kind, kind, compartmentKey: 'one', items: [{ key: kind, name: kind }] })),
      { id: 'two', kind: 'events' as const, compartmentKey: 'two', items: [{ key: 'x', name: 'x' }] },
      { id: 'empty', kind: 'vault' as const, compartmentKey: 'empty', items: [] },
    ] };
    const widths = minimumOwnerWidths(inventory);
    const expected = 2 * DIAGRAM_LAYOUT.padding + 3 * DIAGRAM_LAYOUT.resourceMinWidth + 2 * DIAGRAM_LAYOUT.gap;
    expect(widths.get('one')).toBe(expected);
    expect(widths.get('root')).toBe(expected + 2 * DIAGRAM_LAYOUT.padding);
    expect(widths.has('empty')).toBe(false);
    expect(() => minimumOwnerWidths({ ...inventory, compartments: inventory.compartments.filter((entry) => entry.key !== 'one') })).toThrow('ancestry');
    expect(() => minimumOwnerWidths({ ...inventory, compartments: inventory.compartments.map((entry) => entry.key === 'root' ? { ...entry, parentKey: 'one' } : entry) })).toThrow('ancestry');
    expect(oracle.compYellowFill).toBe('#FAF8D6');
    expect(oracle.compEnvironmentFill).toBe('#FCF9BD');
  });
});

describe('generated diagram quality matrix', () => {
  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('%s preserves composition and canonical data across stages and layers', async (hubKind: HubKind) => {
    const model = emptyLzModel();
    model.network = { hubKind, ...hubKindDefaults(hubKind) };
    const { inventory, tables } = await generated(model);
    const dotsOnly = absoluteNodeRects(buildGraph(model, 5, { showDots: true }, undefined, tables, inventory).nodes);
    const cases: { step: number; options: DiagramOptions }[] = [
      { step: 1, options: {} }, { step: 2, options: {} }, { step: 5, options: {} },
      { step: 5, options: { showEndpoints: true, showDots: true, openTables: [tables[0].id] } },
      { step: 5, options: { showFlows: true } }, { step: 5, options: { allFlows: true } },
    ];
    for (const { step, options } of cases) {
      const graph = buildGraph(model, step, options, undefined, tables, inventory);
      expectLayout(graph, { inventory, routeTables: tables, foundation: step === 1, showRouteTables: !!(options.showFlows || options.allFlows) }, `${hubKind} step ${step} ${JSON.stringify(options)}`);
      expect(structuralCrossings(physicalConnections(graph)), `${hubKind} step ${step} unrelated-resource intersections`).toEqual([]);
      const currentRects = absoluteNodeRects(graph.nodes);
      if (step === 5) for (const dot of currentRects.values()) if (dot.node.kind === 'rtdot') {
        const original = dotsOnly.get(dot.id)!;
        const owner = currentRects.get(dot.node.rtDotPhysicalOwnerId ?? dot.node.rtDotOwnerId!)!;
        const originalOwner = dotsOnly.get(original.node.rtDotPhysicalOwnerId ?? original.node.rtDotOwnerId!)!;
        expect(dot.node.rtDotOwnerId).toBe(original.node.rtDotOwnerId);
        expect((dot.x + dot.width / 2 - owner.x) / owner.width, `${hubKind} canonical horizontal port ${dot.id}`)
          .toBeCloseTo((original.x + original.width / 2 - originalOwner.x) / originalOwner.width, 6);
        expect((dot.y + dot.height / 2 - owner.y) / owner.height, `${hubKind} canonical vertical port ${dot.id}`)
          .toBeCloseTo((original.y + original.height / 2 - originalOwner.y) / originalOwner.height, 6);
      }
      if (options.showFlows || options.allFlows) {
        // Distinct physical links and clear text take priority over best-effort point crossings.
        const budget = { hub_a: 4, hub_b: 4, hub_c: 4, hub_e: 1 };
        expect(structuralLineContacts(physicalConnections(graph)).length, `${hubKind} perpendicular line contacts`).toBeLessThanOrEqual(budget[hubKind]);
      }
    }
  }, 60_000);

  it.each([0, 1, 3, 6])('stacks %i Foundation environments with readable widths and compact gaps', async (count) => {
    const model = environmentCount(count);
    const { inventory, tables } = await generated(model);
    const graph = buildGraph(model, 1, {}, undefined, tables, inventory);
    expectLayout(graph, { inventory, foundation: true }, `Foundation ${count} environments`);
    const cards = graph.nodes.filter((node) => /^cmp-env-\d+$/.test(node.id));
    expect(new Set(cards.map((node) => node.x)).size).toBe(count ? 1 : 0);
    for (let index = 1; index < cards.length; index++) {
      expect(cards[index].y - cards[index - 1].y - cards[index - 1].height).toBe(DIAGRAM_LAYOUT.gap);
    }
  }, 60_000);

  it.each([3, 6])('keeps physical routes clear with %i environments and visible tables', async (count) => {
    const model = environmentCount(count);
    const { inventory, tables } = await generated(model);
    const graph = buildGraph(model, 5, { showFlows: true }, undefined, tables, inventory);
    expectLayout(graph, { inventory, routeTables: tables, showRouteTables: true }, `${count} environments with routing`);
    expect(structuralCrossings(physicalConnections(graph))).toEqual([]);
  }, 60_000);

  it('routes OKE, shared Custom and RPC attachments without crossing unrelated resource boxes', async () => {
    const model = environmentCount(3);
    model.platforms = [newPlatform('oke_simple', [], model.environments)];
    model.sharedPlatforms = [newSharedPlatform('custom', [])];
    model.remotePeeringConnections = [{ id: 'remote', name: 'remote', role: 'acceptor', remoteCidrs: ['10.200.0.0/21'], peerRegionName: 'eu-amsterdam-1' }];
    const { inventory, tables } = await generated(model);
    const graph = buildGraph(model, 5, { allFlows: true }, undefined, tables, inventory);
    expectLayout(graph, { inventory, routeTables: tables, showRouteTables: true }, 'OKE, shared Custom and RPC with routing');
    expect(structuralCrossings(physicalConnections(graph))).toEqual([]);
  }, 60_000);

  it.each(['regional', 'disabled-projects', 'platforms'] as const)('retains %s source conditions and complete ownership', async (variant) => {
    const model = emptyLzModel();
    if (variant === 'regional') Object.assign(model.foundation, { stackScope: 'regional', region: 'eu-amsterdam-1', regionShortName: 'ams', homeRegion: 'eu-frankfurt-1' });
    if (variant === 'disabled-projects') model.environments.forEach((env) => { env.projectNetworkEnabled = false; });
    if (variant === 'platforms') {
      model.platforms = [newPlatform('oke_simple', [], model.environments), newPlatform('custom', [], model.environments)];
      model.sharedPlatforms = [newSharedPlatform('custom', [])];
      model.exadata.exacs = { ...model.exadata.exacs, enabled: true, service: 'vmc', notifications: { default: 'db@example.com' } };
    }
    const { inventory, tables } = await generated(model);
    for (const step of [1, 5]) {
      const graph = buildGraph(model, step, {}, undefined, tables, inventory);
      expectLayout(graph, { inventory, foundation: step === 1 }, `${variant} step ${step}`);
    }
  }, 60_000);

  it('keeps future generated owners and long added resource names readable without clipping', async () => {
    const model = environmentCount(3);
    const { inventory, tables } = await generated(model);
    const parent = inventory.groups.find((group) => group.kind === 'vault')!.compartmentKey;
    inventory.compartments.push({ key: 'FUTURE-COMPARTMENT', name: 'cmp-future-security-services', parentKey: parent });
    inventory.groups.push({ id: 'future-events', kind: 'events', compartmentKey: 'FUTURE-COMPARTMENT', items: [
      { key: 'NEW-EVENT', name: `event-${'a-new-generated-resource-name-'.repeat(5)}` },
      { key: 'ANOTHER-EVENT', name: 'another-new-generated-event' },
    ] });
    for (const step of [1, 5]) expectLayout(buildGraph(model, step, {}, undefined, tables, inventory), { inventory, foundation: step === 1 }, `future resources step ${step}`);
  }, 60_000);
});

describe('layout quality regressions', () => {
  it('rejects a fixed-width attachment pill that clips its full generated label or terminal padding', () => {
    const graph: DiagramModel = { nodes: [
      { id: 'attachment', kind: 'attachment', label: 'drgatt-fra-lz-preprod-proj', x: 0, y: 0, width: 150, height: 26 },
    ], edges: [] };
    expect(attachmentLabelLayout(graph.nodes[0].label).width).toBeGreaterThan(150);
    expect(validateDiagramLayout(graph).map((issue) => issue.code)).toContain('attachment-text');
    graph.nodes[0].width = attachmentLabelLayout(graph.nodes[0].label).width;
    expect(validateDiagramLayout(graph)).toEqual([]);
  });

  it('rejects shared physical DRG trunks even when the connections share a DRG, while allowing point crossings', () => {
    const graph: DiagramModel = {
      nodes: [
        { id: 'one', kind: 'attachment', label: 'One', x: 100, y: 0, width: 160, height: 26 },
        { id: 'two', kind: 'attachment', label: 'Two', x: 100, y: 40, width: 160, height: 26 },
        { id: 'router', kind: 'drg', label: '', x: 0, y: 0, width: 40, height: 66 },
      ],
      edges: [
        { id: 'one-to-router', source: 'one', target: 'router', points: [{ x: 100, y: 13 }, { x: 70, y: 13 }, { x: 70, y: 50 }, { x: 40, y: 50 }] },
        { id: 'two-to-router', source: 'two', target: 'router', points: [{ x: 100, y: 53 }, { x: 70, y: 53 }, { x: 70, y: 20 }, { x: 40, y: 20 }] },
      ],
    };
    expect(physicalSharedSegments(graph)).toEqual([{ edgeIds: ['one-to-router', 'two-to-router'], length: 30 }]);
    expect(validateDiagramLayout(graph).map((issue) => issue.code)).toContain('physical-merge');
    graph.edges[1].points![1].x = 80;
    graph.edges[1].points![2].x = 80;
    expect(physicalSharedSegments(graph)).toEqual([]);
    expect(validateDiagramLayout(graph).some((issue) => issue.code === 'physical-merge')).toBe(false);
    expect(structuralLineContacts(graph)).toHaveLength(1);
  });

  it('keeps endpoint connections outside the complete DRG caption rather than only its glyph box', () => {
    const graph: DiagramModel = {
      nodes: [
        { id: 'attachment', kind: 'attachment', label: 'Attachment', x: 300, y: 180, width: 160, height: 26 },
        { id: 'router', kind: 'drg', label: 'drg-fra-lz-hub', x: 100, y: 100, width: 48, height: 48 },
      ],
      edges: [{ id: 'connection', source: 'attachment', target: 'router', sourceSide: 'left', targetSide: 'right', points: [
        { x: 300, y: 193 }, { x: 160, y: 193 }, { x: 160, y: 124 }, { x: 148, y: 124 },
      ] }],
    };
    const hasCaptionIntrusion = () => validateDiagramLayout(graph).some((issue) => issue.code === 'drg-caption');
    expect(hasCaptionIntrusion()).toBe(true);
    const caption = drgCaptionBounds(graph.nodes[1]);
    graph.edges[0].points![1].x = caption.x + caption.width + 12;
    graph.edges[0].points![2].x = caption.x + caption.width + 12;
    expect(hasCaptionIntrusion()).toBe(false);
  });

  it('rejects broken widths, overlaps, horizontal environment layouts, gaps, inventory and packet anchors', async () => {
    const model = environmentCount(3);
    const { inventory, tables } = await generated(model);
    const foundation = buildGraph(model, 1, {}, undefined, tables, inventory);
    const codes = (graph: DiagramModel, overrides = {}) => validateDiagramLayout(graph, { inventory, foundation: true, ...overrides }).map((entry) => entry.code);
    const width = structuredClone(foundation);
    width.nodes.find((node) => node.id === 'cmp-security')!.width -= 20;
    expect(codes(width)).toContain('shared-width');
    const skinny = structuredClone(foundation);
    skinny.nodes.find((node) => /^cmp-env-\d+$/.test(node.id))!.width = 200;
    expect(codes(skinny)).toContain('foundation-readability');
    const overlap = structuredClone(foundation);
    const environments = overlap.nodes.filter((node) => /^cmp-env-\d+$/.test(node.id));
    Object.assign(environments[1], { x: environments[0].x, y: environments[0].y });
    expect(codes(overlap)).toContain('sibling-overlap');
    const horizontal = structuredClone(foundation);
    horizontal.nodes.find((node) => node.id === 'cmp-env-1')!.x += environments[0].width + DIAGRAM_LAYOUT.gap;
    expect(codes(horizontal)).toContain('foundation-column');
    const gap = structuredClone(foundation);
    gap.nodes.find((node) => node.id === 'cmp-env-1')!.y += 40;
    expect(codes(gap)).toContain('foundation-gap');
    const resourceGap = structuredClone(foundation);
    const groups = resourceGap.nodes.filter((node) => node.kind === 'resourcegroup' && node.parentId === 'cmp-security');
    const repeatedColumn = groups.find((node) => groups.some((other) => other.id !== node.id && other.x === node.x))!;
    const lower = groups.filter((node) => node.x === repeatedColumn.x).sort((a, b) => a.y - b.y)[1];
    lower.y += 40;
    expect(codes(resourceGap)).toContain('resource-column-gap');
    const tall = structuredClone(foundation);
    tall.nodes.find((node) => /^cmp-env-\d+$/.test(node.id))!.height += 1000;
    expect(codes(tall)).toContain('compact-height');
    const clipped = structuredClone(foundation);
    clipped.nodes.find((node) => node.kind === 'resourcegroup')!.resourceItems!.pop();
    expect(codes(clipped)).toContain('inventory');
    const moved = structuredClone(foundation);
    moved.nodes.find((node) => node.kind === 'resourcegroup')!.parentId = 'cmp-platform';
    expect(codes(moved)).toContain('inventory');
    const palette = structuredClone(foundation);
    palette.nodes.find((node) => node.id === 'cmp-network')!.compartmentScope = 'environment';
    expect(codes(palette)).toContain('compartment-palette');
    const narrow = structuredClone(foundation);
    narrow.nodes.find((node) => node.kind === 'resourcegroup')!.width = DIAGRAM_LAYOUT.resourceMinWidth - 1;
    expect(codes(narrow)).toContain('resource-readability');
    const routing = buildGraph(model, 5, { activeFlows: ['prod:egress:web'] }, undefined, tables, inventory);
    routing.edges.find((edge) => edge.waypoints)!.visits![0].distance += 1;
    expect(codes(routing, { foundation: false })).toContain('flow-anchor');
    expect(codes({ ...foundation, flowErrors: ['Selected flow lost its canonical anchor.'] })).toContain('flow-resolution');
    expect(codes({ ...foundation, edges: [{ id: 'missing-endpoint', source: 'cmp-network', target: 'unavailable' }] })).toContain('edge-identity');
    const missingPath = structuredClone(routing);
    delete missingPath.edges.find((edge) => !edge.waypoints)!.points;
    expect(codes(missingPath, { foundation: false })).toContain('structural-path');
    const allTables = buildGraph(model, 5, { showFlows: true }, undefined, tables, inventory);
    const association = allTables.nodes.find((node) => node.kind === 'rtdot')!;
    const missingAssociation = structuredClone(allTables);
    missingAssociation.nodes = missingAssociation.nodes.filter((node) => node.id !== association.id);
    missingAssociation.edges = missingAssociation.edges.filter((edge) => edge.source !== association.id);
    expect(codes(missingAssociation, { foundation: false, routeTables: tables, showRouteTables: true })).toContain('association-inventory');
    const missingLeader = structuredClone(allTables);
    missingLeader.edges = missingLeader.edges.filter((edge) => edge.source !== association.id || edge.target !== association.rtDotTableId);
    expect(codes(missingLeader, { foundation: false, routeTables: tables, showRouteTables: true })).toContain('association-inventory');
  }, 60_000);

  it('measures unrelated resource intersections while exempting actual endpoint ownership and boundary touch', () => {
    const graph: DiagramModel = {
      nodes: [
        { id: 'owner', kind: 'compartment', label: '', x: 0, y: 0, width: 80, height: 100 },
        { id: 'endpoint', kind: 'attachment', label: '', parentId: 'owner', x: 10, y: 40, width: 30, height: 20 },
        { id: 'dot-endpoint', kind: 'rtdot', label: '', rtDotOwnerId: 'endpoint', x: 32, y: 42, width: 16, height: 16 },
        { id: 'target', kind: 'attachment', label: '', x: 180, y: 40, width: 30, height: 20 },
        { id: 'unrelated', kind: 'resourcegroup', label: '', resourceKind: 'events', resourceItems: [], x: 90, y: 40, width: 60, height: 30 },
      ],
      edges: [{ id: 'wire', source: 'endpoint', target: 'target', sourceSide: 'right', targetSide: 'left', points: [{ x: 40, y: 50 }, { x: 180, y: 50 }] }],
    };
    expect(structuralCrossings(graph)).toEqual([{ edgeId: 'wire', nodeId: 'unrelated' }]);
    const routed = { ...graph, edges: routeStructuralEdges(graph.nodes, graph.edges.map((edge) => ({ ...edge, points: undefined }))) };
    expect(structuralCrossings(routed)).toEqual([]);
    const boundary = structuredClone(graph);
    boundary.nodes.find((node) => node.id === 'unrelated')!.y = 50;
    expect(structuralCrossings(boundary)).toEqual([]);
  });

  it('counts grid-vertex and corner contacts once per edge pair while excluding actual shared junctions', () => {
    const graph: DiagramModel = {
      nodes: ['a', 'b', 'c', 'd'].map((id) => ({ id, kind: 'attachment', label: '', x: -1, y: -1, width: 2, height: 2 })),
      edges: [
        { id: 'horizontal', source: 'a', target: 'b', points: [{ x: -10, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }] },
        { id: 'vertical', source: 'c', target: 'd', points: [{ x: 0, y: -10 }, { x: 0, y: 0 }, { x: 0, y: 10 }] },
      ],
    };
    expect(structuralLineContacts(graph)).toEqual([{ edgeIds: ['horizontal', 'vertical'], x: 0, y: 0 }]);
    graph.edges[1].points = [{ x: 0, y: -10 }, { x: 0, y: 0 }, { x: 10, y: 0 }];
    expect(structuralLineContacts(graph)).toHaveLength(1);
    graph.edges[0].points = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    graph.edges[1].points = [{ x: 0, y: 0 }, { x: 0, y: 10 }];
    graph.edges[1].source = 'a';
    expect(structuralLineContacts(graph)).toEqual([]);
    graph.edges[1].source = 'c';
    expect(structuralLineContacts(graph)).toHaveLength(1);
  });

  it('rejects tunnelling through an endpoint table while allowing a connection at its boundary', () => {
    const graph: DiagramModel = {
      nodes: [
        { id: 'attachment', kind: 'attachment', label: '', x: 200, y: 40, width: 20, height: 20 },
        { id: 'table', kind: 'routetable', label: '', x: 20, y: 0, width: 100, height: 100 },
      ],
      edges: [{ id: 'leader', source: 'attachment', target: 'table', sourceSide: 'left', targetSide: 'right', points: [
        { x: 200, y: 50 }, { x: 0, y: 50 }, { x: 0, y: 70 }, { x: 132, y: 70 }, { x: 120, y: 70 },
      ] }],
    };
    expect(validateDiagramLayout(graph).filter((issue) => issue.code === 'table-interior')).toEqual([
      { code: 'table-interior', nodeIds: ['leader', 'table'], message: 'Connector paths must stop at a table boundary without entering any table body.' },
    ]);
    graph.edges[0].points = [{ x: 200, y: 50 }, { x: 120, y: 50 }];
    expect(validateDiagramLayout(graph).some((issue) => issue.code === 'table-interior')).toBe(false);
  });

  it('measures the visible shared trunk once while preserving its crossing with a physical connection', () => {
    const graph: DiagramModel = {
      nodes: [
        ...['dot-a', 'dot-b'].map((id) => ({ id, kind: 'rtdot' as const, label: '', x: 0, y: 0, width: 2, height: 2 })),
        ...['physical-a', 'physical-b'].map((id) => ({ id, kind: 'attachment' as const, label: '', x: 0, y: 0, width: 2, height: 2 })),
        { id: 'table', kind: 'routetable', label: '', x: 100, y: 100, width: 20, height: 20 },
      ],
      edges: [
        { id: 'a', source: 'dot-a', target: 'table', centerX: 50, points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 110 }, { x: 100, y: 110 }] },
        { id: 'b', source: 'dot-b', target: 'table', centerX: 50, points: [{ x: 0, y: 40 }, { x: 50, y: 40 }, { x: 50, y: 110 }, { x: 100, y: 110 }] },
        { id: 'physical', source: 'physical-a', target: 'physical-b', points: [{ x: 40, y: 60 }, { x: 60, y: 60 }] },
      ],
    };
    expect(structuralLineContacts(graph)).toEqual([{ edgeIds: ['a', 'physical'], x: 50, y: 60 }]);
    graph.edges[1].points = [{ x: 0, y: 40 }, { x: 30, y: 40 }, { x: 30, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 110 }, { x: 100, y: 110 }];
    expect(structuralLineContacts(graph)).toEqual([{ edgeIds: ['a', 'physical'], x: 50, y: 60 }]);
  });

  it('exempts only the initial annotation port escape, retaining later crossings with the same owner link', () => {
    const graph: DiagramModel = {
      nodes: [
        { id: 'owner', kind: 'attachment', label: '', x: 100, y: 0, width: 150, height: 26 },
        { id: 'dot', kind: 'rtdot', label: '', rtDotOwnerId: 'owner', x: 92, y: 5, width: 16, height: 16 },
        { id: 'drg', kind: 'drg', label: '', x: 40, y: 70, width: 20, height: 20 },
        { id: 'table', kind: 'routetable', label: '', x: 300, y: 90, width: 100, height: 20 },
      ],
      edges: [
        { id: 'annotation', source: 'dot', target: 'table', sourceSide: 'left', centerX: 200, points: [
          { x: 92, y: 13 }, { x: 88, y: 13 }, { x: 88, y: 60 }, { x: 200, y: 60 }, { x: 200, y: 100 }, { x: 300, y: 100 },
        ] },
        { id: 'physical', source: 'owner', target: 'drg', points: [
          { x: 100, y: 13 }, { x: 88, y: 13 }, { x: 88, y: 40 }, { x: 150, y: 40 }, { x: 150, y: 80 }, { x: 60, y: 80 },
        ] },
      ],
    };
    expect(structuralLineContacts(graph)).toEqual([
      { edgeIds: ['annotation', 'physical'], x: 88, y: 40 },
      { edgeIds: ['annotation', 'physical'], x: 150, y: 60 },
    ]);
  });


});
