import { readFileSync } from 'node:fs';
import { beforeAll, expect, it } from 'vitest';
import type { DiagramEdge, DiagramNode } from '../model/types';
import { optimizeTablePlacement, tableAssociations } from './tablePlacement';
import { absoluteNodeRects } from './flowGeometry';
import { buildGraph, buildGraphLayout } from './buildGraph';
import { complexHybridModel } from './complexHybrid.testSupport';
import { generatePreview } from '../generator/preview';
import { setAssetLoader } from '../generator/jsonnetVm';
import { buildRouteTables } from '../services/routeTables';
import { annotationSharedSegments, structuralCrossings, structuralLineContacts, validateDiagramLayout } from './layoutQuality';
import { associationDisplaySegments } from './displayGeometry';
import { toDrawioXml } from '../export/toDrawio';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') })));
const leaves = new Set(['subnet', 'gateway', 'drg', 'attachment', 'resourcegroup', 'vpn', 'vpntunnel', 'customerrouter', 'fastconnect']);
const overlap = (a: Pick<DiagramNode, 'x' | 'y' | 'width' | 'height'>, b: Pick<DiagramNode, 'x' | 'y' | 'width' | 'height'>) => Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x)
  && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y);

it('includes a line returning through its own resource body in line measurements', () => {
  const nodes: DiagramNode[] = [
    { id: 'owner', kind: 'gateway', label: '', x: 0, y: 0, width: 40, height: 40 },
    { id: 'dot', kind: 'rtdot', rtDotOwnerId: 'owner', label: '', x: 40, y: 10, width: 8, height: 8 },
    { id: 'table', kind: 'routetable', label: '', x: -160, y: 0, width: 100, height: 80 },
  ];
  const edges: DiagramEdge[] = [{ id: 'leader', source: 'dot', target: 'table',
    points: [{ x: 48, y: 14 }, { x: 60, y: 14 }, { x: -60, y: 40 }] }];
  expect(structuralCrossings({ nodes, edges }, { includeOwnerBodies: true })).toEqual([{ edgeId: 'leader', nodeId: 'owner' }]);
});

it('keeps the common table entry at the top-left corner when route rows make the card taller', () => {
  const nodes: DiagramNode[] = [
    { id: 'dot-high', kind: 'rtdot', label: '', x: 40, y: 80, width: 8, height: 8 },
    { id: 'dot-low', kind: 'rtdot', label: '', x: 40, y: 140, width: 8, height: 8 },
    { id: 'table', kind: 'routetable', label: '', x: 300, y: 40, width: 100, height: 300 },
  ];
  const edges: DiagramEdge[] = ['high', 'low'].map((id, i) => ({ id, source: `dot-${id}`, target: 'table',
    points: [{ x: 48, y: 84 + i * 60 }, { x: 300, y: 190 }] }));
  const direct = tableAssociations(nodes, edges);
  expect(direct.map((edge) => edge.points!.at(-1))).toEqual([{ x: 300, y: 40 }, { x: 300, y: 40 }]);
  expect(direct.every((edge) => edge.targetSide === 'left' && edge.targetPort === 0)).toBe(true);
  const taller = tableAssociations(nodes.map((node) => node.id === 'table' ? { ...node, height: 400 } : node), edges);
  expect(taller.map((edge) => edge.points)).toEqual(direct.map((edge) => edge.points));
});

it('connects each owner to its nearest top corner, choosing left on a tie', () => {
  const nodes: DiagramNode[] = [
    { id: 'table', kind: 'routetable', label: '', x: 300, y: 40, width: 100, height: 300 },
    ...[100, 350, 500].map((x, i) => ({ id: `dot-${i}`, kind: 'rtdot' as const, label: '', x, y: 100, width: 8, height: 8 })),
  ];
  const edges: DiagramEdge[] = [100, 350, 500].map((x, i) => ({ id: `edge-${i}`, source: `dot-${i}`, target: 'table',
    points: [{ x, y: 104 }, { x: 300, y: 40 }] }));
  const routed = tableAssociations(nodes, edges);
  expect(routed.map((edge) => edge.points!.at(-1))).toEqual([{ x: 300, y: 40 }, { x: 300, y: 40 }, { x: 400, y: 40 }]);
  expect(routed.map((edge) => edge.targetSide)).toEqual(['left', 'left', 'right']);
  expect(routed.every((edge) => edge.targetPort === 0)).toBe(true);
});

it.each(['hub', 'gateway', 'drg', 'spoke'] as const)('allows %s route cards across any compartment border below its title', (rtTone) => {
  const nodes: DiagramNode[] = [
    { id: 'landingzone', kind: 'landingzone', label: 'LZ', x: 0, y: 0, width: 1000, height: 500 },
    { id: 'network', kind: 'compartment', tone: 'gray', label: 'Platform', parentId: 'landingzone', x: 100, y: 100, width: 400, height: 300 },
    { id: 'table', kind: 'routetable', rtTone, label: 'Routes', parentId: 'landingzone', x: 450, y: 200, width: 100, height: 60 },
  ];
  const placed = optimizeTablePlacement(nodes, [], [0, 700, 800], false);
  expect(placed.find((node) => node.id === 'table')).toEqual(nodes[2]);
});

it('pulls a distant card toward a clear lane beside its owner', () => {
  const nodes: DiagramNode[] = [
    { id: 'landingzone', kind: 'landingzone', label: 'LZ', x: 0, y: 0, width: 1200, height: 600 },
    { id: 'dot', kind: 'rtdot', label: '', x: 500, y: 250, width: 8, height: 8 },
    { id: 'table', kind: 'routetable', label: 'Routes', parentId: 'landingzone', x: 900, y: 250, width: 100, height: 60 },
  ];
  const edges: DiagramEdge[] = [{ id: 'leader', source: 'dot', target: 'table', points: [{ x: 508, y: 254 }, { x: 900, y: 250 }] }];
  const placed = optimizeTablePlacement(nodes, edges, [100, 900, 1050]);
  const card = placed.find((node) => node.id === 'table')!;
  expect(Math.min(Math.abs(card.x - 508), Math.abs(card.x + card.width - 508))).toBe(66);
});

it('keeps left cards on the left and aligns their right edges when clear', () => {
  const nodes: DiagramNode[] = [
    { id: 'landingzone', kind: 'landingzone', label: 'LZ', x: 0, y: 0, width: 1200, height: 800 },
    ...[500, 600].flatMap((x, i): DiagramNode[] => [
      { id: `dot-${i}`, kind: 'rtdot', label: '', x, y: 200 + i * 250, width: 8, height: 8 },
      { id: `table-${i}`, kind: 'routetable', rtKeepLeft: true, label: 'Routes', parentId: 'landingzone', x: 900, y: 200 + i * 250, width: 100, height: 60 },
    ]),
  ];
  const edges: DiagramEdge[] = [500, 600].map((x, i) => ({ id: `leader-${i}`, source: `dot-${i}`, target: `table-${i}`, points: [{ x, y: 204 + i * 250 }, { x: 900, y: 200 + i * 250 }] }));
  const placed = optimizeTablePlacement(nodes, edges, [100, 900, 1050]);
  const cards = placed.filter((node) => node.kind === 'routetable');
  expect(cards.map((card) => card.x + card.width)).toEqual([434, 434]);
});

it.each(['initial', 'right'] as const)('respects a DRG card column preference of %s', (rtColumnPreference) => {
  const nodes: DiagramNode[] = [
    { id: 'landingzone', kind: 'landingzone', label: 'LZ', x: 0, y: 0, width: 1200, height: 600 },
    { id: 'dot', kind: 'rtdot', label: '', x: 500, y: 250, width: 8, height: 8 },
    { id: 'table', kind: 'routetable', rtColumnPreference, label: 'Routes', parentId: 'landingzone', x: 100, y: 250, width: 100, height: 60 },
  ];
  const edges: DiagramEdge[] = [{ id: 'leader', source: 'dot', target: 'table', points: [{ x: 508, y: 254 }, { x: 100, y: 250 }] }];
  const placed = optimizeTablePlacement(nodes, edges, [100, 900, 1050]);
  const card = placed.find((node) => node.id === 'table')!;
  if (rtColumnPreference === 'initial') expect(card.x).toBe(100);
  else expect(card.x).toBeGreaterThan(508);
});

it('stacks the hub ingress and DRG cards beside the hub bottom', () => {
  const nodes: DiagramNode[] = [
    { id: 'landingzone', kind: 'landingzone', label: 'LZ', x: 0, y: 0, width: 1200, height: 800 },
    { id: 'ingress-dot', kind: 'rtdot', label: '', x: 600, y: 300, width: 8, height: 8 },
    { id: 'drg-dot', kind: 'rtdot', label: '', x: 600, y: 500, width: 8, height: 8 },
    { id: 'ingress', kind: 'routetable', rtKeepLeft: true, rtLayoutRole: 'hub-ingress', label: 'Ingress', parentId: 'landingzone', x: 100, y: 100, width: 100, height: 60 },
    { id: 'drg-table', kind: 'routetable', rtKeepLeft: true, rtLayoutRole: 'hub-drg', label: 'DRG', parentId: 'landingzone', x: 100, y: 550, width: 100, height: 120 },
  ];
  const edges: DiagramEdge[] = ['ingress', 'drg'].map((name, i) => ({ id: `e-${name}`, source: `${name}-dot`, target: i ? 'drg-table' : 'ingress', points: [{ x: 600, y: 304 + i * 200 }, { x: 100, y: 100 }] }));
  const placed = optimizeTablePlacement(nodes, edges, [100, 900, 1050]);
  const ingress = placed.find((node) => node.id === 'ingress')!, drg = placed.find((node) => node.id === 'drg-table')!;
  expect(ingress.y).toBe(304);
  expect(drg.x).toBe(ingress.x);
  expect(drg.y).toBe(ingress.y + ingress.height + 16);
});

it('moves an ingress card below its VCN rather than drawing across the VCN', () => {
  const nodes: DiagramNode[] = [
    { id: 'landingzone', kind: 'landingzone', label: 'LZ', x: 0, y: 0, width: 1200, height: 900 },
    { id: 'vcn', kind: 'vcn', label: 'VCN', parentId: 'landingzone', x: 500, y: 100, width: 300, height: 300 },
    { id: 'dot', kind: 'rtdot', rtDotOwnerId: 'vcn', label: '', x: 646, y: 400, width: 8, height: 8 },
    { id: 'table', kind: 'routetable', rtKeepLeft: true, label: 'Ingress', parentId: 'landingzone', x: 200, y: 150, width: 200, height: 80 },
  ];
  const edges: DiagramEdge[] = [{ id: 'leader', source: 'dot', target: 'table', points: [{ x: 650, y: 404 }, { x: 400, y: 150 }] }];
  const placed = optimizeTablePlacement(nodes, edges, [200, 850, 950]);
  expect(placed.find((node) => node.id === 'table')!.y).toBeGreaterThanOrEqual(400);
});

it('leaves only 12 pixels between the hub DRG card and the network compartment', () => {
  const nodes: DiagramNode[] = [
    { id: 'landingzone', kind: 'landingzone', label: 'LZ', x: 0, y: 0, width: 1200, height: 800 },
    { id: 'cmp-network', kind: 'compartment', tone: 'yellow', label: 'Network', parentId: 'landingzone', x: 400, y: 100, width: 600, height: 600 },
    { id: 'drg', kind: 'drg', label: '', x: 676, y: 300, width: 48, height: 48 },
    { id: 'dot', kind: 'rtdot', label: '', x: 700, y: 350, width: 8, height: 8 },
    { id: 'table', kind: 'routetable', rtLayoutRole: 'hub-drg', label: 'DRG', parentId: 'landingzone', x: 100, y: 350, width: 200, height: 100 },
  ];
  const edges: DiagramEdge[] = [{ id: 'leader', source: 'dot', target: 'table', points: [{ x: 700, y: 354 }, { x: 300, y: 350 }] }];
  const placed = optimizeTablePlacement(nodes, edges, [100, 900, 1050]);
  const card = placed.find((node) => node.id === 'table')!;
  expect(400 - card.x - card.width).toBe(12);
  expect(card.y).toBe(360);
});

it('places both spoke cards beside their VCNs and near their owner rows', () => {
  const nodes: DiagramNode[] = [
    { id: 'landingzone', kind: 'landingzone', label: 'LZ', x: 0, y: 0, width: 1600, height: 1500 },
    ...[0, 1].flatMap((i): DiagramNode[] => [
      { id: `env-${i}`, kind: 'compartment', label: 'Environment', parentId: 'landingzone', x: 400, y: 100 + i * 600, width: 600, height: 500 },
      { id: `network-${i}`, kind: 'compartment', label: 'Network', parentId: `env-${i}`, x: 20, y: 60, width: 350, height: 400 },
      { id: `vcn-${i}`, kind: 'vcn', label: 'VCN', parentId: `network-${i}`, x: 20, y: 60, width: 300, height: 300 },
      { id: `subnet-${i}`, kind: 'subnet', label: 'Subnet', parentId: `vcn-${i}`, x: 20, y: 100, width: 260, height: 40 },
      { id: `dot-${i}`, kind: 'rtdot', rtDotOwnerId: `subnet-${i}`, label: '', x: 716, y: 340 + i * 600, width: 8, height: 8 },
      { id: `table-${i}`, kind: 'routetable', rtLayoutRole: 'spoke', label: 'Routes', parentId: 'landingzone', x: 1200, y: 300 + i * 600, width: 200, height: 80 },
    ]),
  ];
  const edges: DiagramEdge[] = [0, 1].map((i) => ({ id: `leader-${i}`, source: `dot-${i}`, target: `table-${i}`, points: [{ x: 720, y: 344 + i * 600 }, { x: 1200, y: 300 + i * 600 }] }));
  const placed = optimizeTablePlacement(nodes, edges, [100, 1200, 1350]);
  for (const i of [0, 1]) {
    const card = placed.find((node) => node.id === `table-${i}`)!;
    expect(card.x).toBe(780);
    expect(card.y).toBe(304 + i * 600);
  }
});

it('places the spokes DRG card below attachment labels', () => {
  const nodes: DiagramNode[] = [
    { id: 'landingzone', kind: 'landingzone', label: 'LZ', x: 0, y: 0, width: 1400, height: 1000 },
    { id: 'drg', kind: 'drg', label: '', x: 400, y: 300, width: 48, height: 48 },
    { id: 'attachment', kind: 'attachment', label: 'Spoke attachment', x: 500, y: 400, width: 250, height: 26 },
    { id: 'dot', kind: 'rtdot', label: '', x: 444, y: 320, width: 8, height: 8 },
    { id: 'table', kind: 'routetable', rtLayoutRole: 'spoke-drg', rtColumnPreference: 'right', label: 'Spokes', parentId: 'landingzone', x: 900, y: 300, width: 250, height: 80 },
  ];
  const edges: DiagramEdge[] = [{ id: 'leader', source: 'dot', target: 'table', points: [{ x: 448, y: 324 }, { x: 900, y: 300 }] }];
  const placed = optimizeTablePlacement(nodes, edges, [100, 900, 1100]);
  const card = placed.find((node) => node.id === 'table')!;
  expect(card.y).toBeGreaterThanOrEqual(462);
  expect(card.x).toBe(472);
});

it('aligns hub subnet cards in one right-hand column', () => {
  const nodes: DiagramNode[] = [
    { id: 'landingzone', kind: 'landingzone', label: 'LZ', x: 0, y: 0, width: 1500, height: 1000 },
    { id: 'hub-vcn', kind: 'vcn', label: 'Hub', x: 400, y: 100, width: 300, height: 400 },
    ...[0, 1].flatMap((i): DiagramNode[] => [
      { id: `dot-${i}`, kind: 'rtdot', label: '', x: 680, y: 180 + i * 150, width: 8, height: 8 },
      { id: `card-${i}`, kind: 'routetable', rtLayoutRole: 'hub-subnet', label: 'Subnet routes', parentId: 'landingzone', x: 900 + i * 100, y: 180 + i * 150, width: 250, height: 80 },
    ]),
  ];
  const edges: DiagramEdge[] = [0, 1].map((i) => ({ id: `leader-${i}`, source: `dot-${i}`, target: `card-${i}`, points: [{ x: 684, y: 184 + i * 150 }, { x: 900, y: 180 + i * 150 }] }));
  const placed = optimizeTablePlacement(nodes, edges, [100, 900, 1200]);
  expect(placed.filter((node) => node.kind === 'routetable').map((node) => node.x)).toEqual([766, 766]);
});

it('compacts environment cards upward and adds right columns instead of spilling into the next environment', () => {
  const nodes: DiagramNode[] = [
    { id: 'landingzone', kind: 'landingzone', label: 'LZ', x: 0, y: 0, width: 1500, height: 1000 },
    { id: 'prod', kind: 'compartment', label: 'Prod', parentId: 'landingzone', x: 400, y: 100, width: 400, height: 300 },
    { id: 'preprod', kind: 'compartment', label: 'Preprod', parentId: 'landingzone', x: 400, y: 420, width: 400, height: 400 },
    { id: 'network', kind: 'compartment', label: 'Network', parentId: 'prod', x: 10, y: 40, width: 320, height: 240 },
    { id: 'vcn', kind: 'vcn', label: 'VCN', parentId: 'network', x: 10, y: 40, width: 300, height: 180 },
    ...[0, 1, 2].flatMap((i): DiagramNode[] => [
      { id: `subnet-${i}`, kind: 'subnet', label: 'Subnet', parentId: 'vcn', x: 20, y: 60 + i * 30, width: 260, height: 20 },
      { id: `dot-${i}`, kind: 'rtdot', rtDotOwnerId: `subnet-${i}`, label: '', x: 696, y: 250 + i * 30, width: 8, height: 8 },
      { id: `card-${i}`, kind: 'routetable', rtLayoutRole: 'spoke', label: 'Routes', parentId: 'landingzone', x: 1000, y: 500 + i * 120, width: 200, height: 100 },
    ]),
  ];
  const edges: DiagramEdge[] = [0, 1, 2].map((i) => ({ id: `leader-${i}`, source: `dot-${i}`, target: `card-${i}`, points: [{ x: 700, y: 254 + i * 30 }, { x: 1000, y: 500 + i * 120 }] }));
  const placed = optimizeTablePlacement(nodes, edges, [100, 1000, 1250]);
  const cards = placed.filter((node) => node.kind === 'routetable');
  for (const card of cards) {
    expect(card.y).toBeGreaterThanOrEqual(156);
    expect(card.y + card.height).toBeLessThanOrEqual(384);
  }
  expect(new Set(cards.map((card) => card.x)).size).toBeGreaterThan(1);
  expect(cards[0].x).toBe(cards[1].x);
  expect(cards[0].y + cards[0].height + 12).toBeLessThanOrEqual(cards[1].y);
});

it('centers the OKE stack beside its own VCN independently of the projects route card', () => {
  const nodes: DiagramNode[] = [
    { id: 'landingzone', kind: 'landingzone', label: 'LZ', x: 0, y: 0, width: 1500, height: 1300 },
    { id: 'prod', kind: 'compartment', label: 'Prod', parentId: 'landingzone', x: 400, y: 100, width: 400, height: 1100 },
    { id: 'network', kind: 'compartment', label: 'Network', parentId: 'prod', x: 10, y: 40, width: 320, height: 1000 },
    { id: 'projects-vcn', kind: 'vcn', label: 'Projects', parentId: 'network', x: 10, y: 40, width: 300, height: 300 },
    { id: 'oke-vcn', kind: 'vcn', label: 'OKE', parentId: 'network', x: 10, y: 540, width: 300, height: 400 },
    ...[0, 1, 2].flatMap((i): DiagramNode[] => [
      { id: `subnet-${i}`, kind: 'subnet', label: 'Subnet', parentId: i ? 'oke-vcn' : 'projects-vcn', x: 20, y: 100 + i * 40, width: 260, height: 30 },
      { id: `dot-${i}`, kind: 'rtdot', rtDotOwnerId: `subnet-${i}`, label: '', x: 696, y: i ? 800 + i * 60 : 300, width: 8, height: 8 },
      { id: `card-${i}`, kind: 'routetable', rtLayoutRole: 'spoke', label: 'Routes', parentId: 'landingzone', x: 1000, y: 300 + i * 120, width: 200, height: 100 },
    ]),
  ];
  const edges: DiagramEdge[] = [0, 1, 2].map((i) => ({ id: `leader-${i}`, source: `dot-${i}`, target: `card-${i}`, points: [{ x: 700, y: i ? 804 + i * 60 : 304 }, { x: 1000, y: 300 + i * 120 }] }));
  const placed = optimizeTablePlacement(nodes, edges, [100, 1000, 1250]);
  const project = placed.find((node) => node.id === 'card-0')!;
  const pods = placed.find((node) => node.id === 'card-1')!;
  const workers = placed.find((node) => node.id === 'card-2')!;
  // OKE VCN absolute top is 680 and its center is 880.
  expect((pods.y + workers.y + workers.height) / 2).toBe(880);
  expect(pods.y - project.y - project.height).toBeGreaterThan(100);
  expect(pods.x).toBe(workers.x);
  expect(pods.y + pods.height + 12).toBe(workers.y);
});

it('permits a direct resource crossing and removes it by moving only the table', () => {
  const nodes: DiagramNode[] = [
    { id: 'owner', kind: 'gateway', label: '', x: 0, y: 0, width: 40, height: 40 },
    { id: 'dot', kind: 'rtdot', rtDotOwnerId: 'owner', label: '', x: 40, y: 10, width: 8, height: 8 },
    { id: 'table', kind: 'routetable', label: '', x: 300, y: 120, width: 100, height: 80 },
    { id: 'obstacle', kind: 'resourcegroup', label: '', x: 135, y: 45, width: 60, height: 105 },
  ];
  const edges: DiagramEdge[] = [{ id: 'leader', source: 'dot', target: 'table', sourceSide: 'right',
    points: [{ x: 48, y: 14 }, { x: 60, y: 14 }, { x: 300, y: 160 }] }];
  expect(structuralCrossings({ nodes, edges: tableAssociations(nodes, edges) })).toContainEqual({ edgeId: 'leader', nodeId: 'obstacle' });
  const columns = [0, 200, 300] as const;
  const placed = optimizeTablePlacement(nodes, edges, columns), routed = tableAssociations(placed, edges);
  expect(placed.filter((n) => n.kind !== 'routetable')).toEqual(nodes.filter((n) => n.kind !== 'routetable'));
  expect(placed.find((n) => n.id === 'table')).not.toEqual(nodes[2]);
  expect(columns).toContain(placed.find((n) => n.id === 'table')!.x);
  expect(structuralCrossings({ nodes: placed, edges: routed })).toEqual([]);
  expect(routed[0].points![0]).toEqual(edges[0].points![0]);
  expect(routed[0].points).toHaveLength(2);
});

it('selects a column automatically instead of creating a new horizontal position', () => {
  const nodes: DiagramNode[] = [
    { id: 'region', kind: 'region', label: '', x: 0, y: 0, width: 900, height: 300 },
    { id: 'owner', kind: 'gateway', label: '', x: 500, y: 100, width: 40, height: 40 },
    { id: 'dot', kind: 'rtdot', rtDotOwnerId: 'owner', label: '', x: 540, y: 110, width: 8, height: 8 },
    { id: 'table', kind: 'routetable', label: '', x: 20, y: 100, width: 100, height: 80 },
  ];
  const edges: DiagramEdge[] = [{ id: 'leader', source: 'dot', target: 'table', sourceSide: 'right',
    points: [{ x: 548, y: 114 }, { x: 560, y: 114 }, { x: 120, y: 140 }] }];
  const placed = optimizeTablePlacement(nodes, edges, [20, 350, 700]);
  expect(placed.find((n) => n.id === 'table')!.x).toBe(700);
});

it('keeps a table near its ports instead of taking a distant slot to avoid one crossing', () => {
  const nodes: DiagramNode[] = [
    { id: 'region', kind: 'region', label: '', x: 0, y: 0, width: 900, height: 1500 },
    { id: 'owner', kind: 'gateway', label: '', x: 0, y: 100, width: 40, height: 40 },
    { id: 'dot', kind: 'rtdot', rtDotOwnerId: 'owner', label: '', x: 40, y: 110, width: 8, height: 8 },
    { id: 'table', kind: 'routetable', label: '', x: 300, y: 600, width: 100, height: 100 },
    { id: 'obstacle', kind: 'resourcegroup', label: '', x: 135, y: 80, width: 60, height: 120 },
  ];
  const edges: DiagramEdge[] = [{ id: 'leader', source: 'dot', target: 'table', sourceSide: 'right',
    points: [{ x: 48, y: 114 }, { x: 60, y: 114 }, { x: 300, y: 650 }] }];
  const placed = optimizeTablePlacement(nodes, edges, [300, 500, 700]);
  const table = placed.find((n) => n.id === 'table')!;
  expect(Math.max(table.y - 114, 114 - table.y - table.height, 0)).toBeLessThanOrEqual(table.width);
  expect(structuralCrossings({ nodes: placed, edges: tableAssociations(placed, edges) })).toContainEqual({ edgeId: 'leader', nodeId: 'obstacle' });
});

it('swaps crowded tables into a better vertical order without a spare slot', () => {
  const nodes: DiagramNode[] = [
    { id: 'high', kind: 'gateway', label: '', x: 0, y: 20, width: 40, height: 40 },
    { id: 'low', kind: 'gateway', label: '', x: 0, y: 100, width: 40, height: 40 },
    { id: 'dot-high', kind: 'rtdot', rtDotOwnerId: 'high', label: '', x: 40, y: 30, width: 8, height: 8 },
    { id: 'dot-low', kind: 'rtdot', rtDotOwnerId: 'low', label: '', x: 40, y: 110, width: 8, height: 8 },
    { id: 'table-high', kind: 'routetable', label: '', x: 300, y: 80, width: 100, height: 40 },
    { id: 'table-low', kind: 'routetable', label: '', x: 300, y: 20, width: 100, height: 40 },
  ];
  const edges: DiagramEdge[] = [
    { id: 'leader-high', source: 'dot-high', target: 'table-high', sourceSide: 'right', points: [{ x: 48, y: 34 }, { x: 60, y: 34 }, { x: 300, y: 100 }] },
    { id: 'leader-low', source: 'dot-low', target: 'table-low', sourceSide: 'right', points: [{ x: 48, y: 114 }, { x: 60, y: 114 }, { x: 300, y: 40 }] },
  ];
  const placed = optimizeTablePlacement(nodes, edges, [300, 500, 700]);
  expect(placed.find((n) => n.id === 'table-high')!.y).toBeLessThan(placed.find((n) => n.id === 'table-low')!.y);
  expect(structuralLineContacts({ nodes: placed, edges: tableAssociations(placed, edges) })).toEqual([]);
});

it('resolves independent shared runs without stalling on another overlapping pair', () => {
  const nodes: DiagramNode[] = [{ id: 'region', kind: 'region', label: '', x: 0, y: 0, width: 900, height: 500 }];
  const edges: DiagramEdge[] = [];
  for (let pair = 0; pair < 3; pair++) for (let member = 0; member < 2; member++) {
    const id = `${pair}-${member}`, x = member * 100, y = 80 + pair * 120;
    nodes.push({ id: `owner-${id}`, kind: 'gateway', label: '', x, y, width: 40, height: 40 },
      { id: `dot-${id}`, kind: 'rtdot', rtDotOwnerId: `owner-${id}`, label: '', x: x + 40, y: y + 10, width: 8, height: 8 },
      { id: `table-${id}`, kind: 'routetable', label: '', x: 300 + member * 200, y: y - 6, width: 100, height: 40 });
    edges.push({ id: `leader-${id}`, source: `dot-${id}`, target: `table-${id}`, sourceSide: 'right',
      points: [{ x: x + 48, y: y + 14 }, { x: x + 60, y: y + 14 }, { x: 300 + member * 200, y: y + 14 }] });
  }
  expect(annotationSharedSegments({ nodes, edges: tableAssociations(nodes, edges) }).length).toBeGreaterThan(0);
  const placed = optimizeTablePlacement(nodes, edges, [300, 500, 700]);
  expect(annotationSharedSegments({ nodes: placed, edges: tableAssociations(placed, edges) })).toEqual([]);
});

it('exchanges columns jointly when all three columns are occupied', () => {
  const nodes: DiagramNode[] = [
    { id: 'region', kind: 'region', label: '', x: 0, y: 0, width: 900, height: 176 },
    { id: 'left', kind: 'gateway', label: '', x: 200, y: 100, width: 40, height: 40 },
    { id: 'right', kind: 'gateway', label: '', x: 600, y: 100, width: 40, height: 40 },
    { id: 'dot-left', kind: 'rtdot', rtDotOwnerId: 'left', label: '', x: 192, y: 110, width: 8, height: 8 },
    { id: 'dot-right', kind: 'rtdot', rtDotOwnerId: 'right', label: '', x: 640, y: 110, width: 8, height: 8 },
    { id: 'table-left', kind: 'routetable', label: '', x: 700, y: 80, width: 100, height: 80 },
    { id: 'table-right', kind: 'routetable', label: '', x: 20, y: 80, width: 100, height: 80 },
    { id: 'table-center', kind: 'routetable', label: '', x: 350, y: 80, width: 100, height: 80 },
  ];
  const edges: DiagramEdge[] = [
    { id: 'leader-left', source: 'dot-left', target: 'table-left', sourceSide: 'left', points: [{ x: 192, y: 114 }, { x: 180, y: 114 }, { x: 700, y: 120 }] },
    { id: 'leader-right', source: 'dot-right', target: 'table-right', sourceSide: 'right', points: [{ x: 648, y: 114 }, { x: 660, y: 114 }, { x: 120, y: 120 }] },
  ];
  const placed = optimizeTablePlacement(nodes, edges, [20, 350, 700]);
  expect(placed.find((n) => n.id === 'table-left')!.x).toBe(20);
  expect(placed.find((n) => n.id === 'table-right')!.x).toBe(700);
});

it('extends a crowded frame vertically while keeping all tables in the three columns', () => {
  const nodes: DiagramNode[] = [
    { id: 'region', kind: 'region', label: '', x: 0, y: 0, width: 900, height: 150 },
    { id: 'tenancy', kind: 'tenancy', parentId: 'region', label: '', x: 0, y: 0, width: 900, height: 150 },
    { id: 'landingzone', kind: 'landingzone', parentId: 'tenancy', label: '', x: 0, y: 0, width: 900, height: 150 },
    { id: 'occupied', kind: 'resourcegroup', label: '', x: 0, y: 56, width: 900, height: 94 },
    { id: 'owner', kind: 'gateway', label: '', x: -80, y: 70, width: 40, height: 40 },
    { id: 'dot', kind: 'rtdot', rtDotOwnerId: 'owner', label: '', x: -40, y: 80, width: 8, height: 8 },
    { id: 'table', kind: 'routetable', label: '', x: -120, y: 70, width: 100, height: 40 },
  ];
  const before = structuredClone(nodes);
  const edges: DiagramEdge[] = [{ id: 'leader', source: 'dot', target: 'table', sourceSide: 'right',
    points: [{ x: -32, y: 84 }, { x: -20, y: 84 }, { x: -20, y: 90 }] }];
  const placed = optimizeTablePlacement(nodes, edges, [16, 300, 600]);
  const table = placed.find((n) => n.id === 'table')!;
  expect([16, 300, 600]).toContain(table.x);
  expect(table.y).toBeGreaterThanOrEqual(162);
  expect(placed.find((n) => n.id === 'landingzone')!.height).toBeGreaterThanOrEqual(table.y + table.height + 16);
  expect(nodes).toEqual(before);
});

it('reflows neighbouring cards when a column exchange needs more vertical space', () => {
  const nodes: DiagramNode[] = [
    { id: 'region', kind: 'region', label: '', x: 0, y: 0, width: 900, height: 300 },
    { id: 'left', kind: 'gateway', label: '', x: 200, y: 100, width: 40, height: 40 },
    { id: 'right', kind: 'gateway', label: '', x: 600, y: 100, width: 40, height: 40 },
    { id: 'dot-left', kind: 'rtdot', rtDotOwnerId: 'left', label: '', x: 192, y: 110, width: 8, height: 8 },
    { id: 'dot-right', kind: 'rtdot', rtDotOwnerId: 'right', label: '', x: 640, y: 110, width: 8, height: 8 },
    { id: 'table-left', kind: 'routetable', label: '', x: 700, y: 80, width: 100, height: 120 },
    { id: 'table-right', kind: 'routetable', label: '', x: 20, y: 80, width: 100, height: 80 },
    { id: 'table-center', kind: 'routetable', label: '', x: 350, y: 56, width: 100, height: 228 },
    { id: 'neighbour', kind: 'routetable', label: '', x: 20, y: 172, width: 100, height: 40 },
    { id: 'neighbour-owner', kind: 'gateway', label: '', x: 160, y: 172, width: 40, height: 40 },
    { id: 'neighbour-dot', kind: 'rtdot', rtDotOwnerId: 'neighbour-owner', label: '', x: 152, y: 182, width: 8, height: 8 },
  ];
  const edges: DiagramEdge[] = [
    { id: 'leader-left', source: 'dot-left', target: 'table-left', sourceSide: 'left', points: [{ x: 192, y: 114 }, { x: 180, y: 114 }, { x: 700, y: 140 }] },
    { id: 'leader-right', source: 'dot-right', target: 'table-right', sourceSide: 'right', points: [{ x: 648, y: 114 }, { x: 660, y: 114 }, { x: 120, y: 120 }] },
    { id: 'leader-neighbour', source: 'neighbour-dot', target: 'neighbour', sourceSide: 'left', points: [{ x: 152, y: 186 }, { x: 140, y: 186 }, { x: 120, y: 192 }] },
  ];
  const placed = optimizeTablePlacement(nodes, edges, [20, 350, 700]);
  expect(placed.find((n) => n.id === 'table-left')!.x).toBe(20);
  expect(placed.find((n) => n.id === 'table-right')!.x).toBe(700);
  const neighbour = placed.find((n) => n.id === 'neighbour')!;
  const leftCard = placed.find((n) => n.id === 'table-left')!;
  expect(neighbour.y).toBeGreaterThanOrEqual(leftCard.y + leftCard.height + 12);
  expect(neighbour.y + neighbour.height).toBeLessThanOrEqual(284);
});

it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('%s compares allowed resource crossings before and after table placement', async (hub) => {
  const model = complexHybridModel(hub), preview = await generatePreview(model), tables = buildRouteTables(model, preview.network);
  const base = buildGraphLayout(model, 5, { allFlows: true }, undefined, tables, preview.inventory);
  const directNodes = optimizeTablePlacement(base.nodes, base.edges, base.tableColumns!, false);
  const direct = { ...base, nodes: directNodes, edges: tableAssociations(directNodes, base.edges) };
  const placed = buildGraph(model, 5, { allFlows: true }, undefined, tables, preview.inventory);
  const physicalPaths = Object.fromEntries(base.edges.filter((edge) => !edge.waypoints && !base.nodes.some((node) => node.id === edge.source && node.kind === 'rtdot')).map((edge) => [edge.id, structuredClone(edge.points!)]));
  expect(validateDiagramLayout(placed, { physicalPaths, inventory: preview.inventory, routeTables: tables, showRouteTables: true })).toEqual([]);
  const broken = structuredClone(placed);
  const physicalEdge = broken.edges.find((edge) => physicalPaths[edge.id] && edge.points!.length > 2)!;
  const start = physicalEdge.points![0];
  physicalEdge.points!.splice(1, 0, { x: start.x + 1, y: start.y }, { x: start.x + 1, y: start.y + 1 },
    { x: start.x, y: start.y + 1 }, { ...start });
  const mutationIssues = validateDiagramLayout(broken, { physicalPaths });
  expect(mutationIssues.some((issue) => issue.code === 'structural-path' && issue.nodeIds.includes(physicalEdge.id))).toBe(true);
  expect(mutationIssues.some((issue) => issue.code === 'edge-geometry' && issue.nodeIds.includes(physicalEdge.id))).toBe(false);
  const fixed = (graph: typeof base) => graph.nodes.filter((n) => n.kind !== 'routetable');
  const physical = (graph: typeof base) => graph.edges.filter((e) => e.waypoints || !base.nodes.some((n) => n.id === e.source && n.kind === 'rtdot'));
  expect(fixed(direct)).toEqual(fixed(base));
  expect(fixed(placed)).toEqual(fixed(base));
  expect(physical(direct)).toEqual(physical(base));
  expect(physical(placed)).toEqual(physical(base));
  for (const edge of placed.edges.filter((e) => base.nodes.some((n) => n.id === e.source && n.kind === 'rtdot'))) {
    expect(edge.points).toHaveLength(2);
    expect(edge.points![0]).toEqual(base.edges.find((e) => e.id === edge.id)!.points![0]);
  }
  expect(structuralCrossings({ nodes: placed.nodes, edges: physical(base) })).toEqual([]);
  const rects = [...absoluteNodeRects(placed.nodes).values()];
  const columns = [...new Set([...absoluteNodeRects(base.nodes).values()].filter((r) => r.node.kind === 'routetable' && r.node.parentId === 'landingzone').map((r) => r.x))];
  expect(columns).toHaveLength(3);
  expect([...absoluteNodeRects(direct.nodes).values()].filter((r) => r.node.kind === 'routetable').every((r) => columns.includes(r.x))).toBe(true);
  for (const table of rects.filter((r) => r.node.kind === 'routetable')) {
    expect(columns).toContain(table.x);
    expect(rects.filter((r) => r.id !== table.id && (leaves.has(r.node.kind) || r.node.kind === 'routetable') && overlap(table, r))).toEqual([]);
  }
  const metrics = (graph: typeof base) => ({
    resourceOverlaps: structuralCrossings(graph, { includeOwnerBodies: true }).filter((hit) => leaves.has(graph.nodes.find((n) => n.id === hit.nodeId)!.kind)).length,
    lineCrossings: structuralLineContacts(graph).length,
    length: Math.round([...associationDisplaySegments(graph.nodes, graph.edges).values()].flat().reduce((sum, path) => sum + path.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - path[i].x, p.y - path[i].y), 0), 0)),
  });
  const before = metrics(direct), after = metrics(placed);
  const hubCard = rects.find((r) => r.id === 'DRGRT-FRA-LZ-HUB-KEY')!;
  const hubPorts = placed.edges.filter((e) => e.target === hubCard.id).map((e) => e.points![0]);
  const hubGap = Math.max(...hubPorts.map((p) => Math.max(hubCard.y - p.y, p.y - hubCard.y - hubCard.height, 0)));
  const hcCard = rects.find((r) => r.id === 'DRGRT-FRA-LZ-HUB-HC-KEY')!;
  const previous = metrics({ ...base, edges: tableAssociations(base.nodes, base.edges) });
  process.stdout.write(`${model.network.hubKind} placement: ${JSON.stringify({ previous, before, after, hubGap, hubY: hubCard.y, hcY: hcCard.y })}\n`);
  expect(hubGap).toBeLessThanOrEqual(hubCard.width * 2);
  expect(after.resourceOverlaps).toBeLessThanOrEqual(previous.resourceOverlaps);
  expect(after.resourceOverlaps).toBeLessThanOrEqual(before.resourceOverlaps);
  if (hub === 'hub_b') expect(after.lineCrossings).toBeLessThan(previous.lineCrossings);
  expect(after.length).toBeLessThan(before.length);
  expect(toDrawioXml(placed)).toContain('orthogonal=0;');
}, 60_000);
