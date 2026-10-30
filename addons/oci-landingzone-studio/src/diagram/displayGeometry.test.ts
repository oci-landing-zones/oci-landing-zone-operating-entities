import { describe, expect, it } from 'vitest';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import type { DiagramEdge, DiagramNode } from '../model/types';
import { buildGraphLayout as buildGraph } from './buildGraph';
import { hubKindDefaults } from '../services/hubKinds';
import { absoluteNodeRects, flowAnchorPoint } from './flowGeometry';
import { associationDisplaySegments, connectionFlowGeometry, flowDisplayPoints, polylinePath, routeStructuralEdges, structuralEdgePoints, type FlowVisitAnchor } from './displayGeometry';
import { pathLengths } from './flowOverlayGeometry';
import { drgCaptionBounds, drgCaptionLayout } from './layoutPolicy';
import { createFlowPlayback, flowHopMarkers, pointAtDistance } from './flowPlayback';
import { generatedRouteTables } from '../services/routingFixtures.testSupport';

describe('shared diagram display geometry', () => {
  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('keeps %s connectors square and on node borders', (hub) => {
    const model = emptyLzModel();
    model.network = { hubKind: hub, ...hubKindDefaults(hub) };
    const graph = buildGraph(model, 5, { showFlows: true });
    const rects = absoluteNodeRects(graph.nodes);
    const edges = graph.edges.filter((edge) => !edge.waypoints);
    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      const points = structuralEdgePoints(edge, rects);
      expect(points.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < points.length; i++) {
        expect(points[i].x === points[i - 1].x || points[i].y === points[i - 1].y).toBe(true);
      }
      for (const [point, id] of [[points[0], edge.source], [points[points.length - 1], edge.target]] as const) {
        const rect = rects.get(id)!;
        expect(point.x === rect.x || point.x === rect.x + rect.width || point.y === rect.y || point.y === rect.y + rect.height).toBe(true);
      }
      expect(polylinePath(points)).not.toMatch(/[QC]/);
    }
  });

  it('keeps every flow on its canonical connection points for live and downloadable views', () => {
    const edges: DiagramEdge[] = ['prod:egress', 'preprod:egress', 'prod:ingress'].map((group) => ({
      id: `flow-${group}#0`, source: 'a', target: 'b', waypoints: ['a', 'b'], points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    }));
    for (const edge of edges) expect(flowDisplayPoints(edge)).toBe(edge.points);
    expect(polylinePath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }])).toBe('M0,0 L10,0 L10,20');
  });

  it.each(['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const)('uses the same %s event point for the route dot, number and packet stop', async (hub) => {
    const model = emptyLzModel();
    model.network = { hubKind: hub, ...hubKindDefaults(hub) };
    const graph = buildGraph(model, 5, { allFlows: true }, undefined, await generatedRouteTables(model));
    expect(graph.flowErrors).toBeUndefined();
    const rects = absoluteNodeRects(graph.nodes);
    const flows = graph.edges.filter((edge) => edge.waypoints);
    expect(flows.length).toBeGreaterThan(0);
    let dotEvents = 0;
    for (const flow of flows) {
      const playback = createFlowPlayback(flow);
      expect(playback.valid, flow.id).toBe(true);
      for (const [index, hop] of flow.flowHops!.entries()) {
        const event = flow.visits![hop.visitIndex];
        const point = flow.points![event.pointIndex];
        expect(pointAtDistance(flow.points!, playback.stops[index].distance)).toEqual(point);
        if (hop.tableId) {
          const dot = rects.get(event.anchorId!)!;
          expect(dot.node.kind).toBe('rtdot');
          expect(point).toEqual({ x: dot.x + dot.width / 2, y: dot.y + dot.height / 2 });
          dotEvents++;
        }
      }
      for (const marker of flowHopMarkers(flow)) {
        expect({ x: marker.x, y: marker.y }).toEqual(pointAtDistance(flow.points!, playback.stops[marker.seq - 1].distance));
      }
    }
    expect(dotEvents).toBeGreaterThan(0);
  });

  const nodes: DiagramNode[] = [
    { id: 'hub', kind: 'vcn', label: '', x: 0, y: 0, width: 200, height: 200 },
    { id: 'fw', kind: 'subnet', label: '', parentId: 'hub', x: 50, y: 40, width: 80, height: 40 },
    { id: 'attach-hub', kind: 'attachment', label: '', x: 80, y: 250, width: 40, height: 20 },
    { id: 'drg', kind: 'drg', label: '', x: 0, y: 300, width: 40, height: 40 },
    { id: 'spoke', kind: 'vcn', label: '', x: 400, y: 0, width: 200, height: 200 },
    { id: 'app', kind: 'subnet', label: '', parentId: 'spoke', x: 40, y: 40, width: 80, height: 40 },
    { id: 'attach-spoke', kind: 'attachment', label: '', x: 300, y: 250, width: 40, height: 20 },
  ];
  const connections: DiagramEdge[] = [
    { id: 'hub-link', source: 'hub', target: 'attach-hub', points: [{ x: 100, y: 200 }, { x: 100, y: 250 }] },
    { id: 'hub-drg', source: 'attach-hub', target: 'drg', points: [{ x: 80, y: 260 }, { x: 60, y: 260 }, { x: 60, y: 320 }, { x: 40, y: 320 }] },
    { id: 'spoke-link', source: 'spoke', target: 'attach-spoke', points: [{ x: 400, y: 100 }, { x: 360, y: 100 }, { x: 360, y: 260 }, { x: 340, y: 260 }] },
    { id: 'spoke-drg', source: 'attach-spoke', target: 'drg', points: [{ x: 300, y: 260 }, { x: 280, y: 260 }, { x: 280, y: 330 }, { x: 40, y: 330 }] },
  ];

  it('records each processing event on its exact dot while traversing repeated physical legs unchanged', () => {
    const sequence = ['app', 'attach-spoke', 'drg', 'attach-hub', 'fw', 'attach-hub', 'drg', 'attach-spoke', 'app'];
    const anchors = new Map<number, FlowVisitAnchor>([
      [0, { owner: 'app', anchorId: 'app-dot', point: { x: 520, y: 60 } }],
      [1, { owner: 'attach-spoke', anchorId: 'spoke-drg-dot', point: { x: 300, y: 260 } }],
      [3, { owner: 'hub', anchorId: 'hub-ingress-dot', point: { x: 100, y: 200 } }],
      [4, { owner: 'fw', anchorId: 'fw-dot', point: { x: 130, y: 60 } }],
      [5, { owner: 'attach-hub', anchorId: 'hub-drg-dot', point: { x: 80, y: 260 } }],
    ]);
    const geometry = connectionFlowGeometry(nodes, connections, sequence, undefined, anchors);
    const lengths = pathLengths(geometry.points).cumulative;
    for (const [index, anchor] of anchors) {
      const event = geometry.visits[index];
      expect(event.node).toBe(sequence[index]);
      expect(event.anchorId).toBe(anchor.anchorId);
      expect(geometry.points[event.pointIndex]).toEqual(anchor.point);
      expect(event.distance).toBe(lengths[event.pointIndex]);
    }
    expect(geometry.visits.map((visit) => visit.distance)).toEqual(geometry.visits.map((visit) => visit.distance).sort((a, b) => a - b));
    expect(geometry.visits[5].distance).toBeGreaterThan(geometry.visits[3].distance);
    expect(geometry.visits[5].pointIndex).toBeGreaterThan(geometry.visits[3].pointIndex);
    for (const edge of connections) {
      for (const expected of [edge.points!, [...edge.points!].reverse()]) {
        const matches = geometry.points.filter((_, index) => expected.every((point, offset) => point.x === geometry.points[index + offset]?.x && point.y === geometry.points[index + offset]?.y));
        expect(matches, edge.id).toHaveLength(1);
      }
    }
    geometry.points.slice(1).forEach((point, index) => expect(point.x === geometry.points[index].x || point.y === geometry.points[index].y).toBe(true));
    expect(geometry.visits[2].anchorId).toBe('drg');
  });

  it('processes a VCN ingress event after its physical entry even when the dot is on another border', () => {
    const anchor = { owner: 'spoke', anchorId: 'spoke-ingress', point: { x: 500, y: 200 } };
    const geometry = connectionFlowGeometry(nodes, connections, ['drg', 'attach-spoke', 'app'], undefined, new Map([[1, anchor]]));
    const entry = [...connections[2].points!].reverse();
    const start = geometry.points.findIndex((point) => point.x === entry[0].x && point.y === entry[0].y);
    expect(geometry.points.slice(start, start + entry.length)).toEqual(entry);
    const event = geometry.visits[1];
    expect(event.pointIndex).toBeGreaterThan(start + entry.length - 1);
    expect(geometry.points[event.pointIndex]).toEqual(anchor.point);
    expect(geometry.visits[2].distance).toBeGreaterThan(event.distance);
    expect(geometry.points.filter((point) => point.x === entry[0].x && point.y === entry[0].y)).toHaveLength(1);
  });

  it('keeps the attachment centre on the path before processing its DRG-end event', () => {
    const anchor = { owner: 'drg', anchorId: 'attachment-at-drg', point: connections[3].points!.at(-1)! };
    const geometry = connectionFlowGeometry(nodes, connections, ['app', 'attach-spoke', 'drg'], undefined, new Map([[1, anchor]]));
    const attachment = flowAnchorPoint(absoluteNodeRects(nodes).get('attach-spoke')!);
    const contains = (point: { x: number; y: number }) => geometry.points.slice(1).some((end, i) => {
      const start = geometry.points[i];
      return start.x === end.x ? point.x === start.x && point.y >= Math.min(start.y, end.y) && point.y <= Math.max(start.y, end.y)
        : point.y === start.y && point.x >= Math.min(start.x, end.x) && point.x <= Math.max(start.x, end.x);
    });
    expect(contains(attachment)).toBe(true);
    expect(geometry.points[geometry.visits[1].pointIndex]).toEqual(anchor.point);
    expect(geometry.visits[1].distance).toBeLessThan(geometry.visits[2].distance);
    const expected = connections[3].points!;
    expect(geometry.points.some((_, index) => expected.every((point, offset) => point.x === geometry.points[index + offset]?.x && point.y === geometry.points[index + offset]?.y))).toBe(true);
  });

  it('passes through each component centre once and processes its dot in the declared direction', () => {
    const resources: DiagramNode[] = [
      { id: 'source', kind: 'subnet', label: '', x: 400, y: 0, width: 100, height: 100 },
      { id: 'firewall', kind: 'subnet', label: '', x: 200, y: 0, width: 100, height: 100 },
      { id: 'gateway', kind: 'gateway', label: '', x: 0, y: 0, width: 76, height: 60 },
    ];
    const anchors = new Map<number, FlowVisitAnchor>([
      [0, { owner: 'source', point: { x: 500, y: 50 }, anchorId: 'source-dot', phase: 'exit' }],
      [1, { owner: 'firewall', point: { x: 300, y: 50 }, anchorId: 'firewall-dot', phase: 'exit' }],
      [2, { owner: 'gateway', point: { x: 21, y: 17 }, anchorId: 'gateway-dot', phase: 'entry' }],
    ]);
    const geometry = connectionFlowGeometry(resources, [], resources.map((node) => node.id), undefined, anchors);
    const lengths = pathLengths(geometry.points).cumulative;
    for (const [index, rect] of [...absoluteNodeRects(resources).values()].entries()) {
      const centre = flowAnchorPoint(rect);
      const occurrences = new Set<number>();
      geometry.points.slice(1).forEach((end, pointIndex) => {
        const start = geometry.points[pointIndex];
        if ((start.x === end.x && centre.x === start.x && centre.y >= Math.min(start.y, end.y) && centre.y <= Math.max(start.y, end.y))
          || (start.y === end.y && centre.y === start.y && centre.x >= Math.min(start.x, end.x) && centre.x <= Math.max(start.x, end.x))) {
          occurrences.add(lengths[pointIndex] + Math.abs(centre.x - start.x) + Math.abs(centre.y - start.y));
        }
      });
      expect(occurrences.size, `${rect.id} is crossed once`).toBe(1);
      const centreDistance = [...occurrences][0];
      if (anchors.get(index)!.phase === 'entry') expect(geometry.visits[index].distance).toBeLessThan(centreDistance);
      else expect(geometry.visits[index].distance).toBeGreaterThan(centreDistance);
    }
    expect(geometry.points[0]).toEqual({ x: 450, y: 50 });
    expect(geometry.points.at(-1)).toEqual({ x: 38, y: 18 });
    for (const [index, anchor] of anchors) expect(geometry.points[geometry.visits[index].pointIndex]).toEqual(anchor.point);
  });

  it('rejects invalid or topologically unrelated event anchors instead of inventing a route', () => {
    expect(() => connectionFlowGeometry(nodes, connections, ['app', 'attach-spoke'], undefined,
      new Map([[0, { owner: 'hub', point: { x: 100, y: 200 } }]]))).toThrow('no outgoing connection');
    expect(() => connectionFlowGeometry(nodes, connections, ['app'], undefined,
      new Map([[1, { owner: 'app', point: { x: 1, y: 1 } }]]))).toThrow('Invalid flow hop anchor');
    expect(() => connectionFlowGeometry(nodes, connections, ['app'], undefined,
      new Map([[0, { owner: 'app', point: { x: NaN, y: 1 } }]]))).toThrow('Invalid flow hop anchor');
    expect(() => connectionFlowGeometry(nodes, connections, ['missing'])).toThrow('Unknown flow resource');
    expect(() => connectionFlowGeometry(nodes, [{ ...connections[0], points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }], ['hub', 'attach-hub']))
      .toThrow('finite orthogonal segments');
  });
});


describe('obstacle-aware shared structural routing', () => {
  const node = (id: string, kind: DiagramNode['kind'], x: number, y: number, width: number, height: number,
    extra: Partial<DiagramNode> = {}): DiagramNode => ({ id, kind, x, y, width, height, label: id, ...extra });
  const crosses = (points: { x: number; y: number }[], obstacle: DiagramNode) => points.slice(1).some((b, i) => {
    const a = points[i];
    return a.y === b.y
      ? a.y > obstacle.y && a.y < obstacle.y + obstacle.height && Math.max(a.x, b.x) > obstacle.x && Math.min(a.x, b.x) < obstacle.x + obstacle.width
      : a.x > obstacle.x && a.x < obstacle.x + obstacle.width && Math.max(a.y, b.y) > obstacle.y && Math.min(a.y, b.y) < obstacle.y + obstacle.height;
  });

  it('avoids unrelated route dots but permits dots representing its actual endpoint ports', () => {
    const nodes = [node('source', 'attachment', 0, 50, 20, 20), node('target', 'drg', 300, 50, 20, 20),
      node('own-dot', 'rtdot', 12, 52, 16, 16, { rtDotOwnerId: 'source' }),
      node('unrelated-dot', 'rtdot', 142, 52, 16, 16, { rtDotOwnerId: 'elsewhere' })];
    const [edge] = routeStructuralEdges(nodes, [{ id: 'physical', source: 'source', target: 'target', sourceSide: 'right', sourcePort: 0.5, targetSide: 'left', targetPort: 0.5 }]);
    expect(crosses(edge.points!, nodes[3])).toBe(false);
    expect(edge.points![0]).toEqual({ x: 20, y: 60 });
  });

  it('keeps automatic shared-table ports in spatial order even when IDs are reversed', () => {
    const nodes = [node('upper', 'attachment', 0, 0, 20, 20), node('lower', 'attachment', 0, 200, 20, 20), node('table', 'routetable', 300, 50, 100, 200)];
    const edges: DiagramEdge[] = [
      { id: 'z-upper', source: 'upper', target: 'table', targetSide: 'left' },
      { id: 'a-lower', source: 'lower', target: 'table', targetSide: 'left' },
    ];
    const routed = routeStructuralEdges(nodes, edges);
    expect(routed[0].targetPort).toBeLessThan(routed[1].targetPort!);
    expect(routed.map((e) => e.id)).toEqual(edges.map((e) => e.id));
    expect(routeStructuralEdges(nodes, [...edges].reverse()).reverse()).toEqual(routed);
    expect(routeStructuralEdges(nodes, routed)).toEqual(routed);
    expect(edges.every((e) => e.points === undefined && e.targetPort === undefined)).toBe(true);
  });

  it('preserves explicit fan ports and allocates distinct ports around them', () => {
    const nodes = [node('upper', 'attachment', 0, 0, 20, 20), node('middle', 'attachment', 0, 100, 20, 20),
      node('lower', 'attachment', 0, 200, 20, 20), node('table', 'routetable', 300, 0, 100, 240)];
    const edges: DiagramEdge[] = [
      { id: 'upper', source: 'upper', target: 'table', targetSide: 'left', targetPort: 0.5 },
      { id: 'middle', source: 'middle', target: 'table', targetSide: 'left' },
      { id: 'lower', source: 'lower', target: 'table', targetSide: 'left' },
    ];
    const routed = routeStructuralEdges(nodes, edges);
    expect(routed[0].targetPort).toBe(0.5);
    expect(new Set(routed.map((edge) => edge.targetPort)).size).toBe(3);
    expect(routed[1].targetPort).toBeLessThan(routed[2].targetPort!);
  });

  it('moves an automatic VCN border port away from a straddling gateway without moving the gateway', () => {
    const nodes = [node('vcn', 'vcn', 100, 0, 200, 200), node('gateway', 'gateway', -30, 70, 60, 60, { parentId: 'vcn' }),
      node('attachment', 'attachment', 0, 90, 20, 20)];
    const [edge] = routeStructuralEdges(nodes, [{ id: 'physical', source: 'vcn', target: 'attachment', sourceSide: 'left' }]);
    expect(edge.points![0].x).toBe(100);
    expect(edge.points![0].y).not.toBe(100);
    expect(crosses(edge.points!, { ...nodes[1], x: 70, y: 70 })).toBe(false);
    expect(nodes[1].y).toBe(70);
  });

  it('preserves fixed ports and returns the least intrusive orthogonal route when a port is trapped', () => {
    const nodes = [node('source', 'attachment', 0, 40, 20, 20), node('target', 'drg', 300, 40, 20, 20), node('trapping', 'resourcegroup', 10, 20, 60, 60)];
    const [edge] = routeStructuralEdges(nodes, [{ id: 'trapped', source: 'source', target: 'target', sourceSide: 'right', sourcePort: 0.5, targetSide: 'left', targetPort: 0.5 }]);
    expect(edge.points![0]).toEqual({ x: 20, y: 50 });
    expect(edge.points!.at(-1)).toEqual({ x: 300, y: 50 });
    expect(edge.sourcePort).toBe(0.5);
    expect(edge.targetPort).toBe(0.5);
    expect(crosses(edge.points!, nodes[2])).toBe(true);
    edge.points!.forEach((p, i, points) => {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      if (i) expect(p.x === points[i - 1].x || p.y === points[i - 1].y).toBe(true);
    });
    expect(() => routeStructuralEdges(nodes, [{ id: 'invalid', source: 'missing', target: 'target' }])).toThrow('Unknown');
  });
});


describe('shared table-line display', () => {
  const dot = (id: string, y: number): DiagramNode => ({ id, kind: 'rtdot', label: '', x: 0, y, width: 16, height: 16 });
  const table = (id: string, y: number): DiagramNode => ({ id, kind: 'routetable', label: '', x: 200, y, width: 100, height: 100 });
  it('draws the exact same-table segment union once and retains unrelated-table overlaps', () => {
    const nodes = [dot('one', 0), dot('two', 40), { ...table('first', 50), x: 200 }, { ...table('second', 200), x: 200 }];
    const edges: DiagramEdge[] = [
      { id: 'a', source: 'one', target: 'first', points: [{ x: 16, y: 8 }, { x: 100, y: 8 }, { x: 100, y: 100 }, { x: 200, y: 100 }] },
      { id: 'b', source: 'two', target: 'first', points: [{ x: 16, y: 48 }, { x: 100, y: 48 }, { x: 100, y: 100 }, { x: 200, y: 100 }] },
      { id: 'c', source: 'two', target: 'second', points: [{ x: 16, y: 48 }, { x: 100, y: 48 }, { x: 100, y: 100 }, { x: 200, y: 100 }] },
    ];
    const units = (path: { x: number; y: number }[]) => path.slice(1).flatMap((b, i) => {
      const a = path[i], horizontal = a.y === b.y, low = horizontal ? Math.min(a.x, b.x) : Math.min(a.y, b.y), high = horizontal ? Math.max(a.x, b.x) : Math.max(a.y, b.y);
      return Array.from({ length: high - low }, (_, j) => horizontal ? `h:${a.y}:${low + j}` : `v:${a.x}:${low + j}`);
    });
    const visible = associationDisplaySegments(nodes, edges);
    for (const target of ['first', 'second']) {
      const members = edges.filter((edge) => edge.target === target);
      const canonical = new Set(members.flatMap((edge) => units(edge.points!)));
      const drawn = members.flatMap((edge) => visible.get(edge.id)!.flatMap(units));
      expect(new Set(drawn)).toEqual(canonical);
      expect(drawn.length).toBe(canonical.size);
    }
    expect(visible.get('c')).toEqual([edges[2].points]);
    expect(associationDisplaySegments(nodes, [...edges].reverse())).toEqual(visible);
  });
});


describe('independent physical attachment fans', () => {
  const sharedLength = (a: { x: number; y: number }[], b: { x: number; y: number }[]) => {
    let total = 0;
    for (let i = 1; i < a.length; i++) for (let j = 1; j < b.length; j++) {
      const aa = a[i - 1], ab = a[i], ba = b[j - 1], bb = b[j];
      if (aa.x === ab.x && ba.x === bb.x && aa.x === ba.x) total += Math.max(0, Math.min(Math.max(aa.y, ab.y), Math.max(ba.y, bb.y)) - Math.max(Math.min(aa.y, ab.y), Math.min(ba.y, bb.y)));
      if (aa.y === ab.y && ba.y === bb.y && aa.y === ba.y) total += Math.max(0, Math.min(Math.max(aa.x, ab.x), Math.max(ba.x, bb.x)) - Math.max(Math.min(aa.x, ab.x), Math.min(ba.x, bb.x)));
    }
    return total;
  };

  it.each((['hub_a', 'hub_b', 'hub_c', 'hub_e'] as const).flatMap((hub) => [
    { hub, vpnCount: 2, shared: false }, { hub, vpnCount: 4, shared: true },
  ]))('keeps $vpnCount VPNs clear for $hub (shared CPE: $shared)', async ({ hub, vpnCount, shared }) => {
    const { emptyHybridConnectivity, newVpn } = await import('../services/hybridConnectivity');
    const { physicalSharedSegments, structuralCrossings, structuralLineContacts } = await import('./layoutQuality');
    const model = emptyLzModel();
    model.network = { hubKind: hub, ...hubKindDefaults(hub) };
    const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
    for (let i = 0; i < vpnCount; i++) {
      const cpe = shared ? 0 : i;
      hybrid.customer_premises_equipments[`cpe${cpe}`] = { ip_address: `203.0.113.${10 + cpe}` };
      hybrid.ipsecs[`vpn${i}`] = { ...newVpn(`cpe${cpe}`), remote_cidrs: [`172.${20 + i}.0.0/16`] };
    }
    const graph = buildGraph(model, 2);
    expect(structuralCrossings(graph)).toEqual([]);
    expect(structuralLineContacts(graph)).toEqual([]);
    expect(physicalSharedSegments(graph)).toEqual([]);
    const rects = absoluteNodeRects(graph.nodes);
    const physical = graph.edges.filter((edge) => edge.source.startsWith('hybrid-vpn-') || edge.source.startsWith('hybrid-cpe-'));
    expect(physical).toHaveLength(vpnCount * 4);
    for (const edge of physical) {
      const points = edge.points!;
      const length = points.slice(1).reduce((sum, point, i) => sum + Math.abs(point.x - points[i].x) + Math.abs(point.y - points[i].y), 0);
      expect(length).toBeCloseTo(Math.abs(points[0].x - points.at(-1)!.x) + Math.abs(points[0].y - points.at(-1)!.y), 6);
      expect(points).toHaveLength(4);
      const source = rects.get(edge.source)!;
      if (source.node.kind === 'vpn') {
        const premises = rects.get(source.node.parentId!)!;
        expect(points[1].x).toBeGreaterThan(premises.x + premises.width);
        expect(points[1].x).toBeLessThan(rects.get(edge.target)!.x);
      }
    }
  });

  it('keeps VPN tunnel runs separated until the compact DRG approach', () => {
    const drg: DiagramNode = { id: 'router', kind: 'drg', label: 'drg-fra-lz-hub', x: 100, y: 84, width: 48, height: 48 };
    const nodes: DiagramNode[] = [drg,
      { id: 'tunnel-1', kind: 'vpntunnel', label: 'Tunnel 1', x: -600, y: 0, width: 500, height: 96 },
      { id: 'tunnel-2', kind: 'vpntunnel', label: 'Tunnel 2', x: -600, y: 120, width: 500, height: 96 },
    ];
    const edges: DiagramEdge[] = nodes.slice(1).map((node, i) => ({ id: `vpn-${i}`, source: node.id, target: drg.id,
      sourceSide: 'right', sourcePort: 0.5, targetSide: 'left', targetPort: (i + 1) / 3 }));
    const routed = routeStructuralEdges(nodes, edges);
    const bendX = drg.x - 128;
    for (const [index, edge] of routed.entries()) {
      expect(edge.points).toEqual([
        { x: -100, y: 48 + index * 120 },
        { x: bendX, y: 48 + index * 120 },
        { x: bendX, y: 100 + index * 16 },
        { x: 100, y: 100 + index * 16 },
      ]);
    }
    expect(sharedLength(routed[0].points!, routed[1].points!)).toBe(0);
    const reversed = edges.map((edge) => ({ ...edge, source: edge.target, target: edge.source,
      sourceSide: edge.targetSide, targetSide: edge.sourceSide, sourcePort: edge.targetPort, targetPort: edge.sourcePort }));
    routeStructuralEdges(nodes, reversed).forEach((edge, i) => expect(edge.points).toEqual([...routed[i].points!].reverse()));
  });

  it('keeps lower fan trunks outside the complete DRG caption while retaining glyph ports', () => {
    const drg: DiagramNode = { id: 'router', kind: 'drg', label: 'A long DRG caption beside physical branches', x: 0, y: 100, width: 48, height: 48 };
    const nodes = [drg, ...Array.from({ length: 4 }, (_, i): DiagramNode => ({ id: `attachment-${i}`, kind: 'attachment', label: 'Attachment', x: 420, y: 20 + i * 60, width: 280, height: 44 }))];
    const edges: DiagramEdge[] = nodes.slice(1).map((node, i) => ({ id: `edge-${i}`, source: node.id, target: drg.id,
      sourceSide: 'left', targetSide: 'right', targetPort: (i + 1) / 5 }));
    const caption = drgCaptionBounds(drg);
    const routed = routeStructuralEdges(nodes, edges);
    for (const [index, edge] of routed.entries()) {
      expect(edge.points!.at(-1)).toEqual({ x: 48, y: 100 + 48 * edges[index].targetPort! });
      expect(edge.points![1].x).toBeGreaterThanOrEqual(48 + drgCaptionLayout(drg.label, drg.width).overhang + 12);
      for (let i = 1; i < edge.points!.length; i++) {
        const a = edge.points![i - 1], b = edge.points![i];
        expect(a.y === b.y ? a.y > caption.y && a.y < caption.y + caption.height && Math.max(a.x, b.x) > caption.x && Math.min(a.x, b.x) < caption.x + caption.width
          : a.x > caption.x && a.x < caption.x + caption.width && Math.max(a.y, b.y) > caption.y && Math.min(a.y, b.y) < caption.y + caption.height).toBe(false);
      }
    }
  });

  it.each([false, true])('avoids the DRG caption for a downward connection (fixed port: %s)', (fixed) => {
    const drg: DiagramNode = { id: 'router', kind: 'drg', label: 'A caption below this DRG', x: 100, y: 0, width: 48, height: 48 };
    const nodes = [drg, { id: 'remote', kind: 'attachment' as const, label: 'Remote connection', x: 100, y: 150, width: 48, height: 32 }];
    const [edge] = routeStructuralEdges(nodes, [{ id: 'connection', source: 'router', target: 'remote',
      ...(fixed ? { sourceSide: 'bottom', sourcePort: 0.5 } as const : {}) }]);
    if (fixed) {
      expect(edge.points![0]).toEqual({ x: 124, y: 48 });
      expect(edge.sourceSide).toBe('bottom');
      expect(edge.sourcePort).toBe(0.5);
    } else expect(['left', 'right']).toContain(edge.sourceSide);
    const caption = drgCaptionBounds(drg);
    for (let i = 1; i < edge.points!.length; i++) {
      const a = edge.points![i - 1], b = edge.points![i];
      expect(a.y === b.y ? a.y > caption.y && a.y < caption.y + caption.height && Math.max(a.x, b.x) > caption.x && Math.min(a.x, b.x) < caption.x + caption.width
        : a.x > caption.x && a.x < caption.x + caption.width && Math.max(a.y, b.y) > caption.y && Math.min(a.y, b.y) < caption.y + caption.height).toBe(false);
    }
  });

  it.each([3, 4, 12])('keeps %i real attachment branches separate with fixed ports and stable spatial ordering', (count) => {
    const nodes: DiagramNode[] = [{ id: 'router', kind: 'drg', label: 'DRG', x: 0, y: 100, width: 80, height: 80 },
      ...Array.from({ length: count }, (_, i) => ({ id: `connection-${i}`, kind: 'attachment' as const,
        label: `An independently named attachment ${i}`, x: 240, y: count === 3 ? 20 + i * 98 : 20 + i * 60, width: 340, height: 44 }))];
    const edges: DiagramEdge[] = nodes.slice(1).map((node, i) => ({ id: `edge-${count - i}`, source: node.id, target: 'router',
      sourceSide: 'left', sourcePort: 0.5, targetSide: 'right', targetPort: (i + 1) / (count + 1) }));
    const routed = routeStructuralEdges(nodes, edges);
    for (let i = 0; i < routed.length; i++) {
      expect(routed[i].points![0]).toEqual({ x: 240, y: count === 3 ? 42 + i * 98 : 42 + i * 60 });
      expect(routed[i].points!.at(-1)).toEqual({ x: 80, y: 100 + 80 * edges[i].targetPort! });
      for (let j = 0; j < i; j++) expect(sharedLength(routed[i].points!, routed[j].points!)).toBe(0);
      const packet = connectionFlowGeometry(nodes, routed, [edges[i].source, 'router']);
      const path = routed[i].points!;
      expect(packet.points.some((_, start) => path.every((point, offset) => packet.points[start + offset]?.x === point.x && packet.points[start + offset]?.y === point.y))).toBe(true);
    }
    expect(routeStructuralEdges(nodes, [...edges].reverse()).reverse()).toEqual(routed);
    expect(routeStructuralEdges(nodes, routed)).toEqual(routed);
    const reversed = edges.map((edge) => ({ ...edge, source: edge.target, target: edge.source,
      sourceSide: edge.targetSide, targetSide: edge.sourceSide, sourcePort: edge.targetPort, targetPort: edge.sourcePort }));
    const reversedRoutes = routeStructuralEdges(nodes, reversed);
    reversedRoutes.forEach((edge, i) => expect(edge.points).toEqual([...routed[i].points!].reverse()));
  });
});


describe('physical terminal approaches', () => {
  const expectForwardTerminals = (points: { x: number; y: number }[]) => {
    if (points.length < 3) return;
    for (const [a, b, c] of [[points[0], points[1], points[2]], points.slice(-3)]) {
      expect((b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y)).toBeGreaterThanOrEqual(-0.001);
    }
  };

  it.each([0, 0.000001, 0.25, 1, 18])('shares an opposing-port gap of %ipx without a terminal U-turn', (gap) => {
    for (const horizontal of [false, true]) {
      const nodes: DiagramNode[] = [
        { id: 'source', kind: 'vcn', label: '', x: 0, y: 0, width: 100, height: 100 },
        { id: 'target', kind: 'attachment', label: '', x: horizontal ? 100 + gap : 200, y: horizontal ? 200 : 100 + gap, width: 100, height: 100 },
      ];
      const edge: DiagramEdge = { id: 'link', source: 'source', target: 'target', sourceSide: horizontal ? 'right' : 'bottom', targetSide: horizontal ? 'left' : 'top', sourcePort: 0.5, targetPort: 0.5 };
      const [routed] = routeStructuralEdges(nodes, [edge]);
      expect(routed.sourcePort).toBe(0.5);
      expect(routed.targetPort).toBe(0.5);
      expectForwardTerminals(routed.points!);
      const initial = routed.points![0], after = routed.points![1];
      expect(horizontal ? after.x - initial.x : after.y - initial.y).toBeLessThanOrEqual(gap / 2 + 0.001);
      const reverse = { ...edge, source: edge.target, target: edge.source, sourceSide: edge.targetSide, targetSide: edge.sourceSide };
      expectForwardTerminals(routeStructuralEdges(nodes, [reverse])[0].points!);
      for (const point of routed.points!) expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
    }
  });

  it.each([2, 3])('keeps generated Hub B terminal approaches forward with %i environments and all layers', async (count) => {
    const { generatePreview } = await import('../generator/preview');
    const { buildRouteTables } = await import('../services/routeTables');
    const model = emptyLzModel();
    model.network = { hubKind: 'hub_b', ...hubKindDefaults('hub_b') };
    if (count === 3) model.environments.push({ id: 'test', name: 'test', securityZone: false,
      network: envNetworkDefaults(2, 'test', [model.network.hubVcnCidr, ...model.environments.map((environment) => environment.network.vcnCidr)]) });
    const preview = await generatePreview(model), tables = buildRouteTables(model, preview.network);
    for (const options of [{}, { showFlows: true }, { allFlows: true }, { allFlows: true, showEndpoints: true, showDots: true }]) {
      const graph = buildGraph(model, 5, options, undefined, tables, preview.inventory);
      expect(graph.flowErrors).toBeUndefined();
      const connection = graph.edges.find((edge) => edge.id === 'e-hub-vcn-attach-hub')!;
      const rects = absoluteNodeRects(graph.nodes), source = rects.get(connection.source)!, target = rects.get(connection.target)!;
      expect(connection.points![0]).toEqual({ x: source.x + source.width / 2, y: source.y + source.height });
      expect(connection.points!.at(-1)).toEqual({ x: target.x + target.width / 2, y: target.y });
      expectForwardTerminals(connection.points!);
      for (const flow of graph.edges.filter((edge) => edge.waypoints)) expect(createFlowPlayback(flow).valid, flow.id).toBe(true);
    }
  });
});
