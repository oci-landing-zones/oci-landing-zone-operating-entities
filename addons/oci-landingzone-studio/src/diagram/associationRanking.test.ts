import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import type { DiagramEdge, DiagramNode } from '../model/types';
import { generatePreview } from '../generator/preview';
import { setAssetLoader } from '../generator/jsonnetVm';
import { hubKindDefaults } from '../services/hubKinds';
import { buildRouteTables } from '../services/routeTables';
import { buildGraph } from './buildGraph';
import { routeStructuralEdges } from './displayGeometry';
import { absoluteNodeRects, clearRoutingSegment } from './flowGeometry';
import { structuralCrossings, structuralLineContacts } from './layoutQuality';

setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') }));

const length = (points: { x: number; y: number }[]) => points.slice(1).reduce((sum, p, i) => sum + Math.abs(p.x - points[i].x) + Math.abs(p.y - points[i].y), 0);
const corners = (points: { x: number; y: number }[]) => {
  const directions = points.slice(1).flatMap((p, i) => p.x === points[i].x && p.y === points[i].y ? [] : [p.x === points[i].x ? 'v' : 'h']);
  return directions.slice(1).filter((direction, i) => direction !== directions[i]).length;
};

describe('complete association route ranking', () => {
  it.each([
    { corridor: 'above', sourceY: 100, targetY: 200 },
    { corridor: 'below', sourceY: 200, targetY: 100 },
  ] as const)('joins a clear corridor $corridor the original rail span without a staircase', ({ corridor, sourceY, targetY }) => {
    const nodes: DiagramNode[] = [
      { id: 'owner', kind: 'subnet', label: '', x: 0, y: sourceY - 20, width: 80, height: 40 },
      { id: 'dot', kind: 'rtdot', label: '', rtDotOwnerId: 'owner', x: 72, y: sourceY - 8, width: 16, height: 16 },
      { id: 'blocker', kind: 'project', label: '', x: 200, y: 99, width: 60, height: 102 },
      { id: 'table', kind: 'routetable', label: '', x: 500, y: targetY - 50, width: 200, height: 100 },
    ];
    const edges = routeStructuralEdges(nodes, [{ id: 'leader', source: 'dot', target: 'table', sourceSide: 'right', targetSide: 'left' }]);
    const edge = edges[0], points = edge.points!;
    const rail = points.filter((point) => point.x === edge.centerX);
    const low = Math.min(sourceY, targetY), high = Math.max(sourceY, targetY);

    expect(rail.some((point) => corridor === 'above' ? point.y < low : point.y > high)).toBe(true);
    expect(corners(points)).toBeLessThanOrEqual(4);
    expect(points[0]).toEqual({ x: 88, y: sourceY });
    expect(points.at(-1)).toEqual({ x: 500, y: targetY });
    expect(structuralCrossings({ nodes, edges })).toEqual([]);
  });

  it('reserves the extended rail before routing a later table in the same gutter', () => {
    const nodes: DiagramNode[] = [
      { id: 'first-owner', kind: 'subnet', label: '', x: 0, y: 80, width: 80, height: 40 },
      { id: 'first-dot', kind: 'rtdot', label: '', rtDotOwnerId: 'first-owner', x: 72, y: 92, width: 16, height: 16 },
      { id: 'second-owner', kind: 'subnet', label: '', x: 0, y: 198, width: 80, height: 40 },
      { id: 'second-dot', kind: 'rtdot', label: '', rtDotOwnerId: 'second-owner', x: 72, y: 210, width: 16, height: 16 },
      { id: 'blocker', kind: 'project', label: '', x: 200, y: -100, width: 60, height: 301 },
      { id: 'first-table', kind: 'routetable', label: '', x: 500, y: 190, width: 200, height: 20 },
      { id: 'second-table', kind: 'routetable', label: '', x: 500, y: 290, width: 200, height: 20 },
    ];
    const leaders: DiagramEdge[] = [
      { id: 'first', source: 'first-dot', target: 'first-table', sourceSide: 'right', targetSide: 'left' },
      { id: 'second', source: 'second-dot', target: 'second-table', sourceSide: 'right', targetSide: 'left' },
    ];
    const independent = leaders.map((edge) => routeStructuralEdges(nodes, [edge])[0]);
    expect(independent[0].centerX).toBe(independent[1].centerX);
    const edges = routeStructuralEdges(nodes, leaders);
    const spans = edges.map((edge) => {
      const heights = edge.points!.filter((point) => point.x === edge.centerX).map((point) => point.y);
      return { x: edge.centerX, low: Math.min(...heights), high: Math.max(...heights) };
    });
    expect(spans[0].high).toBeGreaterThan(200);
    if (spans[0].x === spans[1].x) {
      expect(Math.max(spans[0].low, spans[1].low) - Math.min(spans[0].high, spans[1].high)).toBeGreaterThanOrEqual(8);
    }
    expect(structuralCrossings({ nodes, edges })).toEqual([]);
  });

  it('keeps an upward corridor extension clear of a previous reservation on the reused rail', () => {
    const nodes: DiagramNode[] = [
      { id: 'first-dot', kind: 'rtdot', label: '', x: 72, y: 92, width: 16, height: 16 },
      { id: 'second-dot', kind: 'rtdot', label: '', x: 72, y: 212, width: 16, height: 16 },
      { id: 'blocker', kind: 'project', label: '', x: 200, y: 217, width: 60, height: 104 },
      { id: 'first-table', kind: 'routetable', label: '', x: 500, y: 190, width: 200, height: 20 },
      { id: 'second-table', kind: 'routetable', label: '', x: 500, y: 290, width: 200, height: 20 },
    ];
    const edges = routeStructuralEdges(nodes, [
      { id: 'first', source: 'first-dot', target: 'first-table', sourceSide: 'right', targetSide: 'left' },
      { id: 'second', source: 'second-dot', target: 'second-table', sourceSide: 'right', targetSide: 'left' },
    ]);
    expect(edges[0].centerX).toBe(edges[1].centerX);
    const firstHigh = Math.max(...edges[0].points!.filter((point) => point.x === edges[0].centerX).map((point) => point.y));
    const secondLow = Math.min(...edges[1].points!.filter((point) => point.x === edges[1].centerX).map((point) => point.y));
    expect(secondLow - firstHigh).toBeGreaterThanOrEqual(8);
    expect(structuralCrossings({ nodes, edges })).toEqual([]);
  });

  it('joins the existing rail at the clear corridor without returning to the source height', async () => {
    const model = emptyLzModel();
    model.network = { hubKind: 'hub_b', ...hubKindDefaults('hub_b') };
    model.foundation.cisLevel = 1;
    model.environments.push({ id: 'test', name: 'test', securityZone: false,
      network: envNetworkDefaults(2, 'test', [model.network.hubVcnCidr, ...model.environments.map((env) => env.network.vcnCidr)]) });
    const preview = await generatePreview(model), tables = buildRouteTables(model, preview.network);
    for (const options of [{ showFlows: true }, { allFlows: true }, { allFlows: true, showEndpoints: true }]) {
      const graph = buildGraph(model, 5, options, undefined, tables, preview.inventory);
      const table = tables.find((entry) => entry.associations.some((owner) => owner.nodeId === 'cmp-env-1-vcn-sn-0'))!;
      const edge = graph.edges.find((entry) => entry.target === table.id && graph.nodes.find((node) => node.id === entry.source)?.rtDotOwnerId === 'cmp-env-1-vcn-sn-0')!;
      const points = edge.points!, first = points[0], last = points.at(-1)!;
      const rects = absoluteNodeRects(graph.nodes), owner = rects.get('cmp-env-1-vcn-sn-0')!;
      expect(clearRoutingSegment(rects, points[1], { x: edge.centerX!, y: first.y }, [edge.source, edge.target], 0, [owner.id, table.id])).toBe(false);
      expect(length(points)).toBeCloseTo(Math.abs(last.x - first.x) + Math.abs(last.y - first.y), 6);
      expect(corners(points)).toBeLessThanOrEqual(4);
      expect(structuralCrossings(graph)).toEqual([]);
      expect(edge.targetPort).toBe(0.5);
    }
  }, 60_000);

  it('keeps an obstacle-avoiding prefix when the short horizontal approach is blocked', () => {
    const nodes: DiagramNode[] = [
      { id: 'owner', kind: 'subnet', label: '', x: 0, y: 80, width: 80, height: 40 },
      { id: 'dot', kind: 'rtdot', label: '', rtDotOwnerId: 'owner', x: 72, y: 92, width: 16, height: 16 },
      { id: 'blocker', kind: 'project', label: '', x: 200, y: 40, width: 60, height: 120 },
      { id: 'table', kind: 'routetable', label: '', x: 500, y: 50, width: 200, height: 100 },
    ];
    const edges: DiagramEdge[] = [{ id: 'leader', source: 'dot', target: 'table', sourceSide: 'right', targetSide: 'left' }];
    const routed = routeStructuralEdges(nodes, edges), graph = { nodes, edges: routed };
    expect(routed[0].points!.some((point) => point.y < 40 || point.y > 160)).toBe(true);
    expect(structuralCrossings(graph)).toEqual([]);
    expect(routed[0].points![0]).toEqual({ x: 88, y: 100 });
  });

  it('validates the first approach when a pinned dot has no outward escape stub', () => {
    const nodes: DiagramNode[] = [
      { id: 'owner', kind: 'subnet', label: '', x: 0, y: 80, width: 80, height: 40 },
      { id: 'dot', kind: 'rtdot', label: '', rtDotOwnerId: 'owner', x: 72, y: 92, width: 16, height: 16 },
      { id: 'blocker', kind: 'project', label: '', x: 88, y: 90, width: 6, height: 20 },
      { id: 'table', kind: 'routetable', label: '', x: 500, y: 50, width: 200, height: 100 },
    ];
    const edges = routeStructuralEdges(nodes, [{ id: 'leader', source: 'dot', target: 'table', sourceSide: 'right', targetSide: 'left' }]);
    expect(structuralCrossings({ nodes, edges })).toEqual([]);
    expect(edges[0].points![0]).toEqual({ x: 88, y: 100 });
    expect(edges[0].points!.some((point) => point.y !== 100)).toBe(true);
  });

  it('rejects a shorter shortcut that would add a contact with an unrelated physical line', () => {
    const nodes: DiagramNode[] = [
      { id: 'owner', kind: 'subnet', label: '', x: 0, y: 80, width: 80, height: 40 },
      { id: 'dot', kind: 'rtdot', label: '', rtDotOwnerId: 'owner', x: 72, y: 92, width: 16, height: 16 },
      { id: 'table', kind: 'routetable', label: '', x: 500, y: 100, width: 200, height: 200 },
      { id: 'upper', kind: 'project', label: '', x: 300, y: 0, width: 20, height: 20 },
      { id: 'lower', kind: 'project', label: '', x: 300, y: 220, width: 20, height: 20 },
    ];
    const edges: DiagramEdge[] = [
      { id: 'physical', source: 'upper', target: 'lower', sourceSide: 'bottom', targetSide: 'top', sourcePort: 0.5, targetPort: 0.5 },
      { id: 'leader', source: 'dot', target: 'table', sourceSide: 'right', targetSide: 'left' },
    ];
    const routed = routeStructuralEdges(nodes, edges), graph = { nodes, edges: routed };
    const leader = routed.find((edge) => edge.id === 'leader')!;
    expect(leader.points!.some((point) => point.y < 20 || point.y > 220)).toBe(true);
    expect(structuralLineContacts(graph)).toEqual([]);
    expect(structuralCrossings(graph)).toEqual([]);
  });
});
